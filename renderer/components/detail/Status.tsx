import { Icon } from '@rsuite/icons'
import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import { BsChevronLeft, BsX } from 'react-icons/bs'
import { Button, Content, FlexboxGrid, Header, List } from 'rsuite'

import type { Account } from '@/entities/account'
import type { CustomEmojiCategory } from '@/entities/emoji'
import type { Server } from '@/entities/server'
import { mapCustomEmojiCategory } from '@/utils/emojiData'
import { getAccount, getServer } from '@/utils/storage'
import { FormattedMessage, useIntl } from 'react-intl'
import Status from '../timelines/status/Status'
import { TIMELINE_STATUSES_COUNT } from '@/defaults'

type Props = {
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	openReport: (status: Entity.Status, client: MegalodonInterface) => void
	openFromOtherAccount: (status: Entity.Status) => void
}

const StatusDetail: React.FC<Props> = (props) => {
	const { formatMessage } = useIntl()
	const [client, setClient] = useState<MegalodonInterface | null>(null)
	const [server, setServer] = useState<Server | null>(null)
	const [account, setAccount] = useState<Account | null>(null)
	const [status, setStatus] = useState<Entity.Status | null>(null)
	const [ancestors, setAncestors] = useState<Array<Entity.Status>>([])
	const [descendants, setDescendants] = useState<Array<Entity.Status>>([])
	const [customEmojis, setCustomEmojis] = useState<Array<CustomEmojiCategory>>([])

	const router = useRouter()

	useEffect(() => {
		const f = async () => {
			let cli: MegalodonInterface
			let server: Server
			if (router.query.account_id && router.query.server_id) {
				const [account, s] = await getAccount({
					id: Number.parseInt(router.query.account_id.toLocaleString()),
				})
				server = s
				setServer(s)
				setAccount(account)
				cli = generator(server.sns, server.base_url, account.access_token, 'Fedistar')
				setClient(cli)
			} else if (router.query.server_id) {
				const s = await getServer({ id: Number.parseInt(router.query.server_id.toString()) })
				server = s
				setServer(s)
				setAccount(null)
				cli = generator(server.sns, server.base_url, undefined, 'Fedistar')
				setClient(cli)
			}
			if (router.query.status_id) {
				setAncestors([])
				setDescendants([])
				const res = await cli.getStatus(router.query.status_id.toString())
				setStatus(res.data)
				const c = await cli.getStatusContext(router.query.status_id as string, { limit: TIMELINE_STATUSES_COUNT})
				setAncestors(c.data.ancestors)
				setDescendants(c.data.descendants)
			} else {
				setStatus(null)
			}

			if (cli) {
				const emojis = await cli.getInstanceCustomEmojis()
				setCustomEmojis(mapCustomEmojiCategory(server.domain, emojis.data))
			}
		}
		f()
	}, [router.query.status_id, router.query.server_id, router.query.account_id])

	const back = () => {
		router.back()
	}

	const close = () => {
		router.push({ query: {} })
	}

	const updateStatus = useCallback(
		(updated: Entity.Status) => {
			if (status.id === updated.id) {
				setStatus(updated)
			} else if (status.reblog && status.reblog.id === updated.id) {
				setStatus(Object.assign({}, status, { reblog: updated }))
			} else if (status.reblog && updated.reblog && status.reblog.id === updated.reblog.id) {
				setStatus(Object.assign({}, status, { reblog: updated.reblog }))
			}
			setAncestors((last) =>
				last.map((status) => {
					if (status.id === updated.id) return updated
					if (status.reblog && status.reblog.id === updated.id) return Object.assign({}, status, { reblog: updated })
					if (status.reblog && updated.reblog && status.reblog.id === updated.reblog.id) return Object.assign({}, status, { reblog: updated.reblog })
					return status
				}),
			)

			setDescendants((last) =>
				last.map((status) => {
					if (status.id === updated.id) return updated
					if (status.reblog && status.reblog.id === updated.id) return Object.assign({}, status, { reblog: updated })
					if (status.reblog && updated.reblog && status.reblog.id === updated.reblog.id) return Object.assign({}, status, { reblog: updated.reblog })
					return status
				}),
			)
		},
		[status, setStatus, ancestors, setAncestors, descendants, setDescendants],
	)

	const setAccountDetail = (userId: string, serverId: number, accountId?: number) => {
		if (accountId) {
			router.push({ query: { user_id: userId, server_id: serverId, account_id: accountId } })
		} else {
			router.push({ query: { user_id: userId, server_id: serverId } })
		}
	}

	const setTagDetail = (tag: string, serverId: number, accountId?: number) => {
		if (accountId) {
			router.push({ query: { tag: tag, server_id: serverId, account_id: accountId } })
		} else {
			router.push({ query: { tag: tag, server_id: serverId } })
		}
	}

	return (
		<>
			<Header style={{ backgroundColor: 'var(--rs-border-secondary)' }}>
				<FlexboxGrid justify="space-between">
					<FlexboxGrid.Item>
						<Button appearance="link" onClick={back}>
							<Icon as={BsChevronLeft} style={{ fontSize: '1.4em' }} />
							<FormattedMessage id="detail.back" />
						</Button>
					</FlexboxGrid.Item>
					<FlexboxGrid.Item>
						<Button appearance="link" onClick={close} title={formatMessage({ id: 'detail.close' })}>
							<Icon as={BsX} style={{ fontSize: '1.4em' }} />
						</Button>
					</FlexboxGrid.Item>
				</FlexboxGrid>
			</Header>
			<Content style={{ height: '100%', backgroundColor: 'var(--rs-bg-card)', overflowY: 'auto' }} className="timeline-scrollable">
				<List hover style={{ width: 'max(340px, 30vw)' }}>
					{[...ancestors, status, ...descendants]
						.filter((s) => s !== null)
						.map((status) => (
							<List.Item
								key={status.id}
								style={{
									paddingTop: '2px',
									paddingBottom: '2px',
									backgroundColor: 'var(--rs-border-secondary)',
									boxShadow: '0 -1px 0 var(--rs-bg-well),0 1px 0 var(--rs-bg-well)',
								}}
							>
								<Status
									status={status}
									client={client}
									server={server}
									account={account}
									columnWidth="sm"
									updateStatus={updateStatus}
									openMedia={props.openMedia}
									setReplyOpened={() => null}
									setAccountDetail={setAccountDetail}
									setTagDetail={setTagDetail}
									openReport={props.openReport}
									openFromOtherAccount={props.openFromOtherAccount}
									customEmojis={customEmojis}
								/>
							</List.Item>
						))}
				</List>
			</Content>
		</>
	)
}

export default StatusDetail
