import Reply from '@/components/compose/Status'
import Time from '@/components/utils/Time'
import type { Account } from '@/entities/account'
import type { CustomEmojiCategory } from '@/entities/emoji'
import type { Server } from '@/entities/server'
import type { ColumnWidth } from '@/entities/timeline'
import emojify from '@/utils/emojify'
import { open } from '@/utils/openBrowser'
import { type ParsedAccount, accountMatch, findAccount, findLink, findTag, privacyIcon, privacyColor } from '@/utils/statusParser'
import { Icon } from '@rsuite/icons'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import { type HTMLAttributes, type MouseEventHandler, useEffect, useState, useContext } from 'react'
import { BsArrowRepeat, BsPin } from 'react-icons/bs'
import { FormattedMessage, useIntl } from 'react-intl'
import { Avatar, Button, FlexboxGrid, Notification, useToaster } from 'rsuite'
import Actions from './Actions'
import Attachments from './Attachments'
import Body from './Body'
import Poll from './Poll'
import { TheDeskContext } from '@/context'
import { TIMELINE_STATUSES_COUNT } from '@/defaults'

type Props = {
	status: Entity.Status
	client: MegalodonInterface
	server: Server
	account: Account | null
	pinned?: boolean
	columnWidth: ColumnWidth
	updateStatus: (status: Entity.Status) => void
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	setReplyOpened?: (opened: boolean) => void
	setStatusDetail?: (statusId: string, serverId: number, accountId?: number) => void
	setAccountDetail: (userId: string, serverId: number, accountId?: number) => void
	setTagDetail: (tag: string, serverId: number, accountId?: number) => void
	openReport: (status: Entity.Status, client: MegalodonInterface) => void
	openFromOtherAccount: (status: Entity.Status) => void
	customEmojis: Array<CustomEmojiCategory>
	filters?: Array<Entity.Filter>
} & HTMLAttributes<HTMLElement>
const stripForSpoil = (html: string) => {
	const div = document.createElement("div")
	div.innerHTML = html
	const text = div.textContent || div.innerText || ""
	const protomatch = /(https?|ftp):\/\//g
	const b = text.replace(protomatch, '').replace(/:[a-zA-Z0-9_]:/g, '')
	return b
}
const Status: React.FC<Props> = (props) => {
	const status = originalStatus(props.status)
	const { timelineConfig } = useContext(TheDeskContext)
	const b = stripForSpoil(status.content)
	const maxLength = timelineConfig.max_length
	const tooLong = maxLength && b && b.length > maxLength
	const tooLongText = tooLong ? `${b.slice(0, 50)}...` : ''
	const spoilerText = status.spoiler_text || tooLongText

	const isAnimeIcon = timelineConfig.animation === 'yes'

	const { formatMessage } = useIntl()
	const { client } = props
	const [showReply, setShowReply] = useState<boolean>(false)
	const [showEdit, setShowEdit] = useState<boolean>(false)
	const [spoilered, setSpoilered] = useState<boolean>(status.spoiler_text.length > 0 || tooLong)
	const [ignoreFilter, setIgnoreFilter] = useState<boolean>(false)

	const toaster = useToaster()

	useEffect(() => {
		if (props.setReplyOpened) {
			if (showReply) {
				props.setReplyOpened(showReply)
				setShowEdit(false)
			} else if (showEdit) {
				props.setReplyOpened(showEdit)
				setShowReply(false)
			} else {
				props.setReplyOpened(false)
			}
		}
	}, [showReply, showEdit])

	const statusClicked: MouseEventHandler<HTMLDivElement> = async (e) => {
		// Check username
		const parsedAccount = findAccount(e.target as HTMLElement, 'status-body')
		if (parsedAccount) {
			e.preventDefault()
			e.stopPropagation()

			const account = await searchAccount(parsedAccount, props.status, props.client, props.server)
			if (account) {
				props.setAccountDetail(account.id, props.server.id, props.account?.id)
			} else {
				// biome-ignore lint/style/useConst: <explanation>
				let confirmToaster: any
				confirmToaster = toaster.push(
					notification(
						'info',
						formatMessage({ id: 'dialog.account_not_found.title' }),
						formatMessage({ id: 'dialog.account_not_found.message' }),
						formatMessage({ id: 'dialog.account_not_found.button' }),
						() => {
							open(parsedAccount.url)
							toaster.remove(confirmToaster)
						},
					),
					{ placement: 'topCenter', duration: 0 },
				)
			}
			return
		}

		// Check hashtag
		const parsedTag = findTag(e.target as HTMLElement, 'status-body')
		if (parsedTag) {
			e.preventDefault()
			e.stopPropagation()
			props.setTagDetail(parsedTag, props.server.id, props.account?.id)
			return
		}

		// Check link
		const url = findLink(e.target as HTMLElement, 'status-body')
		if (url) {
			open(url)
			e.preventDefault()
			e.stopPropagation()
		} else {
			if (props.setStatusDetail) {
				props.setStatusDetail(props.status.id, props.server.id, props.account?.id)
			}
		}
	}

	const emojiClicked = async (e: Entity.Reaction) => {
		if (e.me) {
			const res = await props.client.deleteEmojiReaction(status.id, e.name)
			props.updateStatus(res.data)
		} else {
			const res = await props.client.createEmojiReaction(status.id, e.name)
			props.updateStatus(res.data)
		}
	}

	const refresh = async () => {
		const res = await props.client.getStatus(props.status.id)
		props.updateStatus(res.data)
	}

	if (!ignoreFilter && props.filters?.map((f) => f.phrase).filter((keyword) => props.status.content.toLowerCase().includes(keyword.toLowerCase())).length > 0) {
		return (
			<div className="status" style={{ textAlign: 'center', paddingTop: '0.5em', paddingBottom: '0.5em' }}>
				<FormattedMessage id="timeline.status.filtered" />
				<Button appearance="subtle" size="sm" onClick={() => setIgnoreFilter(true)} style={{ marginLeft: '0.2em' }}>
					<FormattedMessage id="timeline.status.show_anyway" />
				</Button>
			</div>
		)
	}

	return (
		<div className="status">
			{pinnedHeader(props.pinned)}
			{rebloggedHeader(props.status)}
			<div style={{ display: 'flex' }}>
				{/** icon **/}
				<div style={{ width: '56px', padding: '6px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
					<Avatar
						src={isAnimeIcon ? status.account.avatar : status.account.avatar_static}
						onClick={() => props.setAccountDetail(status.account.id, props.server.id, props.account?.id)}
						style={{ cursor: 'pointer' }}
						title={status.account.acct}
						alt={status.account.acct}
					/>
					<Icon as={privacyIcon(status.visibility)} style={{ fontSize: '0.8em', marginBottom: '5px', color: privacyColor(status.visibility) }} />
				</div>
				{/** status **/}
				<div style={{ paddingRight: '8px', width: 'calc(100% - 56px)', boxSizing: 'border-box' }}>
					<div className="metadata">
						<FlexboxGrid>
							{/** account name **/}
							<FlexboxGrid.Item
								colspan={18}
								style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
								onClick={() => props.setAccountDetail(status.account.id, props.server.id, props.account?.id)}
							>
								<span dangerouslySetInnerHTML={{ __html: emojify(status.account.display_name, status.account.emojis) }} />
								<span style={{ color: 'var(--rs-text-tertiary)' }}>@{status.account.acct}</span>
							</FlexboxGrid.Item>
							{/** timestamp **/}
							<FlexboxGrid.Item colspan={6} style={{ textAlign: 'right', color: 'var(--rs-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
								<Time time={status.created_at} onClick={() => props.setStatusDetail && props.setStatusDetail(props.status.id, props.server.id, props.account?.id)} />
							</FlexboxGrid.Item>
						</FlexboxGrid>
					</div>
					<Body status={status} onClick={statusClicked} spoilered={spoilered || tooLong} spoilerText={spoilerText} setSpoilered={setSpoilered} />
					{!spoilered && (
						<>
							{status.poll && <Poll poll={status.poll} client={props.client} pollUpdated={refresh} emojis={status.emojis} />}
							{status.media_attachments.length > 0 && <Attachments attachments={status.media_attachments} sensitive={status.sensitive} openMedia={props.openMedia} columnWidth={props.columnWidth} />}
							{status.emoji_reactions &&
								status.emoji_reactions.map((e) => (
									<Button appearance="subtle" size="sm" key={e.name} onClick={() => emojiClicked(e)} active={e.me} disabled={e.name.includes('@') && props.server.sns === 'firefish'} title={e.name}>
										{e.url ? (
											<>
												<img src={e.url} style={{ height: '20px' }} alt={e.name} /> <span style={{ marginLeft: '0.2em' }}>{e.count}</span>
											</>
										) : (
											<span>
												{e.name} {e.count}
											</span>
										)}
									</Button>
								))}
						</>
					)}
					<Actions
						disabled={props.server.account_id === null}
						server={props.server}
						account={props.account}
						status={status}
						client={client}
						setShowReply={setShowReply}
						setShowEdit={setShowEdit}
						updateStatus={props.updateStatus}
						openReport={() => props.openReport(status, props.client)}
						openFromOtherAccount={() => props.openFromOtherAccount(status)}
						customEmojis={props.customEmojis}
					/>
				</div>
			</div>
			{showReply && (
				<div style={{ padding: '8px 12px' }}>
					<Reply client={client} server={props.server} account={props.account} in_reply_to={status} onClose={() => setShowReply(false)} />
				</div>
			)}
			{showEdit && (
				<div style={{ padding: '8px 12px' }}>
					<Reply client={client} server={props.server} account={props.account} edit_target={status} onClose={() => setShowEdit(false)} />
				</div>
			)}
		</div>
	)
}

const originalStatus = (status: Entity.Status) => {
	if (status.reblog && !status.quote) return status.reblog
	return status
}

const pinnedHeader = (pinned?: boolean) => {
	if (pinned) {
		return (
			<div style={{ color: 'var(--rs-text-tertiary)' }}>
				<div style={{ alignItems: 'middle', display: 'flex' }}>
					<div style={{ paddingRight: '4px', paddingLeft: '8px', width: '32px', boxSizing: 'border-box' }}>
						<Icon as={BsPin} />
					</div>
					<div
						style={{
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							width: 'calc(100% - 32px)',
						}}
					>
						<FormattedMessage id="timeline.status.pinned_post" />
					</div>
				</div>
			</div>
		)
	}
	return null
}

const rebloggedHeader = (status: Entity.Status) => {
	if (status.reblog && !status.quote) {
		return (
			<div style={{ color: 'var(--rs-text-tertiary)' }}>
				<div style={{ alignItems: 'middle', display: 'flex' }}>
					<div style={{ paddingRight: '4px', paddingLeft: '8px', width: '32px', boxSizing: 'border-box' }}>
						<Icon as={BsArrowRepeat} style={{ color: 'green' }} />
					</div>
					<div
						style={{
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							width: 'calc(100% - 32px)',
						}}
					>
						<span dangerouslySetInnerHTML={{ __html: emojify(status.account.display_name, status.account.emojis) }} />
					</div>
				</div>
			</div>
		)
	}
	return null
}

async function searchAccount(account: ParsedAccount, status: Entity.Status, client: MegalodonInterface, server: Server) {
	if (status.in_reply_to_account_id) {
		const res = await client.getAccount(status.in_reply_to_account_id)
		if (res.status === 200) {
			const user = accountMatch([res.data], account, server.domain)
			if (user) return user
		}
	}
	if (status.in_reply_to_id) {
		const res = await client.getStatusContext(status.id, { limit: TIMELINE_STATUSES_COUNT})
		if (res.status === 200) {
			const accounts: Array<Entity.Account> = res.data.ancestors.map((s) => s.account).concat(res.data.descendants.map((s) => s.account))
			const user = accountMatch(accounts, account, server.domain)
			if (user) return user
		}
	}
	try {
		const res = await client.lookupAccount(account.acct)
		return res.data
	} catch (e) {
		const res = await client.searchAccount(account.url, { resolve: true })
		if (res.data.length === 0) return null
		const user = accountMatch(res.data, account, server.domain)
		if (user) return user
		return null
	}
}

function notification(type: 'info' | 'success' | 'warning' | 'error', title: string, message: string, button: string, callback: () => void) {
	return (
		<Notification type={type} header={title} closable>
			<p>{message}</p>
			<Button onClick={callback}>{button}</Button>
		</Notification>
	)
}

export default Status
