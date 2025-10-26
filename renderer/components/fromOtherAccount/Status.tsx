import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import { Icon } from '@rsuite/icons'
import { useContext, useEffect, useState } from 'react'
import { BsPaperclip } from 'react-icons/bs'
import { FormattedMessage } from 'react-intl'
import { Avatar, Button, FlexboxGrid, Loader, Modal, Placeholder } from 'rsuite'
import Reply from '@/components/compose/Status'
import Time from '@/components/utils/Time'
import { TheDeskContext } from '@/context'
import type { Account } from '@/entities/account'
import type { CustomEmojiCategory } from '@/entities/emoji'
import type { Server } from '@/entities/server'
import { mapCustomEmojiCategory } from '@/utils/emojiData'
import emojify from '@/utils/emojify'
import Actions from '../timelines/status/Actions'
import Body from '../timelines/status/Body'

type Props = {
	target: Entity.Status
	server: Server
	account: Account
	client: MegalodonInterface | null
	next: () => void
}
export default function Status(props: Props) {
	const [statuses, setStatuses] = useState<Array<Entity.Status>>([])
	const [searching, setSearching] = useState(false)
	const [customEmojis, setCustomEmojis] = useState<Array<CustomEmojiCategory>>([])

	useEffect(() => {
		if (props.client === null) {
			return
		}
		const f = async () => {
			setSearching(true)
			try {
				const res = await props.client.search(props.target.url, { type: 'statuses', resolve: true, limit: 1 })
				setStatuses(res.data.statuses)
			} catch (err) {
				console.error(err)
			} finally {
				setSearching(false)
			}

			const emojis = await props.client.getInstanceCustomEmojis()
			setCustomEmojis(mapCustomEmojiCategory(props.server.domain, emojis.data))
		}
		f()
	}, [props.client, props.target])

	const replaceStatus = (status: Entity.Status) => {
		setStatuses((current) =>
			current.map((s) => {
				if (s.id === status.id) return status
				if (s.reblog && s.reblog.id === status.id) return Object.assign({}, s, { reblog: status })
				if (status.reblog && s.id === status.reblog.id) return status.reblog
				if (status.reblog && s.reblog && s.reblog.id === status.reblog.id) return Object.assign({}, s, { reblog: status.reblog })
				return s
			})
		)
	}

	return (
		<>
			<Modal.Body>
				<Modal.Title>
					<FormattedMessage id="from_other_account.status.title" values={{ account: `@${props.account.username}@${props.server.domain}` }} />
				</Modal.Title>
				<div style={{ paddingTop: '2em' }}>
					{searching ? (
						<>
							<Placeholder.Paragraph rows={3} />
							<Loader center content={<FormattedMessage id="from_other_account.status.searching" />} />
						</>
					) : statuses.length > 0 ? (
						statuses.map((status, index) => (
							<Post client={props.client} status={status} key={status.id} updateStatus={replaceStatus} server={props.server} account={props.account} customEmojis={customEmojis} />
						))
					) : (
						<p style={{ color: 'var(--rs-state-error)' }}>
							<FormattedMessage id="from_other_account.status.not_found" values={{ server: props.server.domain }} />
						</p>
					)}
				</div>
			</Modal.Body>
			<Modal.Footer>
				<Button appearance="primary" block onClick={() => props.next()}>
					<FormattedMessage id="from_other_account.status.next" />
				</Button>
			</Modal.Footer>
		</>
	)
}

type PostProps = {
	server: Server
	account: Account
	status: Entity.Status
	client: MegalodonInterface
	updateStatus: (status: Entity.Status) => void
	customEmojis: Array<CustomEmojiCategory>
}

function Post(props: PostProps) {
	const { status, client } = props
	const { timelineConfig } = useContext(TheDeskContext)
	const isAnimeIcon = timelineConfig.animation === 'yes'
	const [showReply, setShowReply] = useState(false)
	const [spoilered, setSpoilered] = useState(status.spoiler_text.length > 0)

	return (
		<>
			<FlexboxGrid>
				{/** icon **/}
				<FlexboxGrid.Item colspan={3}>
					<div style={{ margin: '6px' }}>
						<Avatar src={isAnimeIcon ? status.account.avatar : status.account.avatar_static} style={{ cursor: 'pointer' }} title={status.account.acct} alt={status.account.acct} />
					</div>
				</FlexboxGrid.Item>
				{/** status **/}
				<FlexboxGrid.Item colspan={21} style={{ paddingRight: '8px' }}>
					<div className="metadata">
						<FlexboxGrid>
							{/** account name **/}
							<FlexboxGrid.Item colspan={18} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
								<span dangerouslySetInnerHTML={{ __html: emojify(status.account.display_name, status.account.emojis) }} />
								<span>@{status.account.acct}</span>
							</FlexboxGrid.Item>
							{/** timestamp **/}
							<FlexboxGrid.Item colspan={6} style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
								<Time time={status.created_at} />
							</FlexboxGrid.Item>
						</FlexboxGrid>
					</div>
					<Body status={status} spoilered={spoilered} spoilerText={status.spoiler_text} setSpoilered={setSpoilered} />
					{!spoilered &&
						status.media_attachments.map((media, index) => (
							<div key={media.id}>
								<Button appearance="subtle" size="sm">
									<Icon as={BsPaperclip} />
									{media.id}
								</Button>
							</div>
						))}
					<div className="toolbox">
						<Actions
							disabled={{
								reply: false,
								reblog: false,
								favourite: false,
								bookmark: false,
								emoji: true,
								detail: true
							}}
							server={props.server}
							account={props.account}
							status={status}
							client={client}
							setShowReply={setShowReply}
							updateStatus={props.updateStatus}
							customEmojis={props.customEmojis}
						/>
					</div>
				</FlexboxGrid.Item>
			</FlexboxGrid>
			{showReply && (
				<div style={{ padding: '8px 12px' }}>
					<Reply client={client} server={props.server} account={props.account} in_reply_to={status} onClose={() => setShowReply(false)} />
				</div>
			)}
		</>
	)
}
