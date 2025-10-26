import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import { Icon } from '@rsuite/icons'
import { useRouter } from 'next/router'
import { useContext, useEffect, useState } from 'react'
import { BsChevronLeft, BsPersonPlus, BsPersonX, BsPin, BsX } from 'react-icons/bs'
import { FormattedMessage, useIntl } from 'react-intl'
import { Virtuoso } from 'react-virtuoso'
import { Button, Content, FlexboxGrid, Header, List, Loader } from 'rsuite'
import { TheDeskContext, TimelineRefreshContext } from '@/context'
import type { Account } from '@/entities/account'
import type { CustomEmojiCategory } from '@/entities/emoji'
import type { Server } from '@/entities/server'
import { mapCustomEmojiCategory } from '@/utils/emojiData'
import { addTimeline, getAccount, getServer } from '@/utils/storage'
import Status from '../timelines/status/Status'

type Props = {
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	openReport: (status: Entity.Status, client: MegalodonInterface) => void
	openFromOtherAccount: (status: Entity.Status) => void
}

export default function TagDetail(props: Props) {
	const { formatMessage } = useIntl()
	const [client, setClient] = useState<MegalodonInterface | null>(null)
	const [server, setServer] = useState<Server | null>(null)
	const [account, setAccount] = useState<Account | null>(null)
	const [statuses, setStatuses] = useState<Array<Entity.Status>>([])
	const [tag, setTag] = useState('')
	const [hashtag, setHashtag] = useState<Entity.Tag | null>(null)
	const [customEmojis, setCustomEmojis] = useState<Array<CustomEmojiCategory>>([])
	const { timelineRefresh } = useContext(TimelineRefreshContext)

	const router = useRouter()

	useEffect(() => {
		const f = async () => {
			let cli: MegalodonInterface
			let server: Server
			if (router.query.account_id && router.query.server_id) {
				const [account, s] = await getAccount({
					id: Number.parseInt(router.query.account_id.toLocaleString())
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
			if (router.query.tag) {
				setTag(router.query.tag.toString())
			}

			if (cli) {
				const emojis = await cli.getInstanceCustomEmojis()
				setCustomEmojis(mapCustomEmojiCategory(server.domain, emojis.data))
			}
		}
		f()
	}, [router.query.tag, router.query.server_id, router.query.account_id])

	useEffect(() => {
		if (tag && client) {
			const f = async () => {
				const res = await client.getTagTimeline(tag)
				setStatuses(res.data)
				try {
					const t = await client.getTag(tag)
					setHashtag(t.data)
				} catch (err) {
					console.warn(err)
				}
			}
			f()
		}
	}, [tag, client])

	const back = () => {
		router.back()
	}

	const close = () => {
		router.push({ query: {} })
	}

	const addTimelineFn = async () => {
		if (tag.length <= 0) {
			return
		}
		await addTimeline(server, { kind: 'tag', name: tag, listId: null, columnWidth: 'sm' })
		timelineRefresh()
	}

	const followHashtag = async () => {
		if (hashtag && client) {
			await client.followTag(hashtag.name)
			const t = await client.getTag(hashtag.name)
			setHashtag(t.data)
		}
	}

	const unfollowHashtag = async () => {
		if (hashtag && client) {
			await client.unfollowTag(hashtag.name)
			const t = await client.getTag(hashtag.name)
			setHashtag(t.data)
		}
	}

	const updateStatus = (status: Entity.Status) => {
		const renew = statuses.map((s) => {
			if (s.id === status.id) {
				return status
			}
			if (s.reblog && s.reblog.id === status.id) {
				return Object.assign({}, s, { reblog: status })
			}
			if (status.reblog && s.id === status.reblog.id) {
				return status.reblog
			}
			if (status.reblog && s.reblog && s.reblog.id === status.reblog.id) {
				return Object.assign({}, s, { reblog: status.reblog })
			}
			return s
		})
		setStatuses(renew)
	}

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
						{hashtag && hashtag.following && (
							<Button appearance="link" onClick={unfollowHashtag} title={formatMessage({ id: 'detail.unfollow_tag' })}>
								<Icon as={BsPersonX} style={{ fontSize: '1.2em' }} />
							</Button>
						)}
						{hashtag && !hashtag.following && (
							<Button appearance="link" onClick={followHashtag} title={formatMessage({ id: 'detail.follow_tag' })}>
								<Icon as={BsPersonPlus} style={{ fontSize: '1.2em' }} />
							</Button>
						)}

						<Button appearance="link" onClick={addTimelineFn} title={formatMessage({ id: 'detail.pin' })}>
							<Icon as={BsPin} style={{ fontSize: '1.2em' }} />
						</Button>
						<Button appearance="link" onClick={close} title={formatMessage({ id: 'detail.close' })}>
							<Icon as={BsX} style={{ fontSize: '1.4em' }} />
						</Button>
					</FlexboxGrid.Item>
				</FlexboxGrid>
			</Header>
			{statuses.length === 0 ? (
				<Loader style={{ margin: '10em auto' }} />
			) : (
				<Content style={{ height: '100%', backgroundColor: 'var(--rs-bg-card)' }}>
					<List style={{ height: '100%' }}>
						<Virtuoso
							style={{ height: '100%' }}
							data={statuses}
							className="timeline-scrollable"
							itemContent={(_, status) => (
								<List.Item key={status.id} style={{ paddingTop: '2px', paddingBottom: '2px', backgroundColor: 'var(--rs-bg-card)' }}>
									<Status
										status={status}
										client={client}
										server={server}
										account={account}
										columnWidth={340}
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
							)}
						/>
					</List>
				</Content>
			)}
		</>
	)
}
