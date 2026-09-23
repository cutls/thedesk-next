import type { Entity, MegalodonInterface, Response } from '@cutls/megalodon'
import Picker from '@emoji-mart/react'
import { Icon } from '@rsuite/icons'
import { type Dispatch, forwardRef, type ReactElement, type SetStateAction, useContext, useRef, useState } from 'react'
import { BsBookmark, BsEmojiSmile, BsEnvelope, BsFillBookmarkFill, BsLock, BsQuote, BsRepeat, BsReply, BsStar, BsStarFill, BsThreeDots } from 'react-icons/bs'
import { FormattedMessage, useIntl } from 'react-intl'
import { Dropdown, FlexboxGrid, IconButton, Popover, useToaster, Whisper } from 'rsuite'
import alert from '@/components/utils/alert'
import type { Account } from '@/entities/account'
import type { CustomEmojiCategory } from '@/entities/emoji'
import type { Server } from '@/entities/server'
import { Context } from '@/theme'
import { data } from '@/utils/emojiData'
import { openInBrowser, writeText } from '@/utils/openBrowser'
import ActionButton from './ActionButton'

type Props = {
	disabled:
		| boolean
		| {
				reply: boolean
				reblog: boolean
				favourite: boolean
				bookmark: boolean
				emoji: boolean
				quote: boolean
				detail: boolean
		  }
	server: Server
	account: Account | null
	status: Entity.Status
	client: MegalodonInterface
	showCount?: boolean
	setShowReply?: Dispatch<SetStateAction<boolean>>
	setShowEdit?: Dispatch<SetStateAction<boolean>>
	setShowQuote?: Dispatch<SetStateAction<boolean>>
	updateStatus: (status: Entity.Status) => void
	revokeQuoting?: () => void
	ableToRevoke?: boolean
	openReport?: () => void
	openFromOtherAccount?: () => void
	translatePost?: () => void
	customEmojis: Array<CustomEmojiCategory>
}

const Actions: React.FC<Props> = (props) => {
	const { formatMessage } = useIntl()
	const { theme } = useContext(Context)

	const { status, client } = props
	const [favouriteActivating, setFavouriteActivating] = useState<boolean>(false)
	const [favouriteDeactivating, setFavouriteDeactivating] = useState<boolean>(false)
	const [reblogActivating, setReblogActivating] = useState<boolean>(false)
	const [reblogDeactivating, setReblogDeactivating] = useState<boolean>(false)

	const toast = useToaster()
	const emojiPickerRef = useRef(null)

	const reblog = async () => {
		let res: Response<Entity.Status>
		if (status.reblogged) {
			setReblogActivating(false)
			setReblogDeactivating(true)
			try {
				res = await client.unreblogStatus(status.id)
			} catch {
				toast.push(alert('error', formatMessage({ id: 'alert.failedUnreblog' })), { placement: 'topStart' })
			}
		} else {
			setReblogDeactivating(false)
			setReblogActivating(true)
			try {
				res = await client.reblogStatus(status.id)
			} catch {
				toast.push(alert('error', formatMessage({ id: 'alert.failedReblog' })), { placement: 'topStart' })
			}
		}
		props.updateStatus(res.data)
	}

	const favourite = async () => {
		let res: Response<Entity.Status>
		if (status.favourited) {
			setFavouriteActivating(false)
			setFavouriteDeactivating(true)
			try {
				res = await client.unfavouriteStatus(status.id)
			} catch {
				toast.push(alert('error', formatMessage({ id: 'alert.failedUnfavourite' })), { placement: 'topStart' })
			}
		} else {
			setFavouriteDeactivating(false)
			setFavouriteActivating(true)
			try {
				res = await client.favouriteStatus(status.id)
			} catch {
				toast.push(alert('error', formatMessage({ id: 'alert.failedFavourite' })), { placement: 'topStart' })
			}
		}
		props.updateStatus(res.data)
	}

	const bookmark = async () => {
		let res: Response<Entity.Status>
		if (status.bookmarked) {
			try {
				res = await client.unbookmarkStatus(status.id)
			} catch {
				toast.push(alert('error', formatMessage({ id: 'alert.failedUnbookmark' })), { placement: 'topStart' })
			}
		} else {
			try {
				res = await client.bookmarkStatus(status.id)
			} catch {
				toast.push(alert('error', formatMessage({ id: 'alert.failedBookmark' })), { placement: 'topStart' })
			}
		}
		props.updateStatus(res.data)
	}

	const onEmojiSelect = async (emoji) => {
		let name = emoji.name
		if (emoji.native) {
			name = emoji.native
		}
		const res = await props.client.createEmojiReaction(props.status.id, name)
		props.updateStatus(res.data)

		emojiPickerRef?.current.close()
	}

	// biome-ignore lint/correctness/noNestedComponentDefinitions: <is OK!!>
	const EmojiPicker = forwardRef<HTMLDivElement>((prop, ref) => (
		<Popover ref={ref} {...prop}>
			<Picker data={data} custom={props.customEmojis} onEmojiSelect={onEmojiSelect} previewPosition="none" set="native" perLine="6" theme={theme === 'high-contrast' ? 'dark' : theme} />
		</Popover>
	))
	const isAvailableEmoji = props.server.emoji_reactions
	const isAvailableQuote = props.server.quote_support && status.quote_approval?.current_user !== 'denied'

	return (
		<div className="toolbox">
			<FlexboxGrid>
				<FlexboxGrid.Item>
					<ActionButton
						disabled={typeof props.disabled === 'boolean' ? props.disabled : props.disabled.reply}
						count={props.showCount ? status.replies_count : undefined}
						icon={<Icon as={BsReply} />}
						onClick={() => props.setShowReply((current) => !current)}
						title={formatMessage({ id: 'timeline.actions.reply' })}
					/>
				</FlexboxGrid.Item>
				<FlexboxGrid.Item>
					<ActionButton
						disabled={(typeof props.disabled === 'boolean' ? props.disabled : props.disabled.reblog) || status.visibility === 'direct' || status.visibility === 'private'}
						className="reblog-action"
						count={props.showCount ? status.reblogs_count : undefined}
						activating={reblogActivating}
						deactivating={reblogDeactivating}
						icon={reblogIcon(props.status)}
						onClick={reblog}
						title={formatMessage({ id: 'timeline.actions.reblog' })}
					/>
				</FlexboxGrid.Item>
				<FlexboxGrid.Item>
					<ActionButton
						disabled={typeof props.disabled === 'boolean' ? props.disabled : props.disabled.favourite}
						className="favourite-action"
						count={props.showCount ? status.favourites_count : undefined}
						activating={favouriteActivating}
						deactivating={favouriteDeactivating}
						icon={favouriteIcon(props.status)}
						onClick={favourite}
						title={formatMessage({ id: 'timeline.actions.favourite' })}
					/>
				</FlexboxGrid.Item>
				<FlexboxGrid.Item>
					<ActionButton
						disabled={typeof props.disabled === 'boolean' ? props.disabled : props.disabled.bookmark}
						icon={bookmarkIcon(props.status)}
						count={props.showCount ? null : undefined}
						onClick={bookmark}
						title={formatMessage({ id: 'timeline.actions.bookmark' })}
					/>
				</FlexboxGrid.Item>
				{isAvailableEmoji && (
					<FlexboxGrid.Item>
						<Whisper trigger="click" preventOverflow delay={100} ref={emojiPickerRef} speaker={<EmojiPicker />}>
							<IconButton
								appearance="link"
								icon={<Icon as={BsEmojiSmile} />}
								count={props.showCount ? null : undefined}
								disabled={(typeof props.disabled === 'boolean' ? props.disabled : props.disabled.emoji) || !isAvailableEmoji}
								title={formatMessage({ id: 'timeline.actions.emojiReaction' })}
							/>
						</Whisper>
					</FlexboxGrid.Item>
				)}
				<FlexboxGrid.Item>
					<ActionButton
						disabled={(typeof props.disabled === 'boolean' ? props.disabled : props.disabled.quote) || !isAvailableQuote}
						icon={<Icon as={BsQuote} />}
						count={props.showCount ? status.quotes_count : undefined}
						onClick={() => props.setShowQuote((current) => !current)}
						title={formatMessage({ id: 'timeline.actions.quote' })}
					/>
				</FlexboxGrid.Item>
				<FlexboxGrid.Item>
					<Whisper
						trigger="click"
						preventOverflow
						speaker={({ className, left, top, onClose }, ref) =>
							detailMenu(
								{
									className,
									left,
									top,
									onClose,
									own: props.account && props.account.account_id === props.status.account.id,
									status: props.status,
									disabled: typeof props.disabled === 'boolean' ? props.disabled : props.disabled.detail,
									openBrowser: () => {
										openInBrowser(status.url)
									},
									copyLink: async () => {
										writeText(status.url)
									},
									openEdit: () => {
										props.setShowEdit((current) => !current)
									},
									onDelete: () => {
										// After after deleted, streaming will receive a delete event.
										// So we don't need update parent timelines, the delete event will be handled.
										client.deleteStatus(props.status.id)
									},
									onReport: () => {
										props.openReport()
									},
									ableToRevoke: props.ableToRevoke,
									onRevokeQuoting: () => {
										props.revokeQuoting()
									},
									onFromOtherAccount: () => {
										props.openFromOtherAccount()
									},
									translateIt: props.translatePost
								},
								ref
							)
						}
					>
						<IconButton appearance="link" icon={<Icon as={BsThreeDots} />} title={formatMessage({ id: 'timeline.actions.detail.title' })} />
					</Whisper>
				</FlexboxGrid.Item>
			</FlexboxGrid>
		</div>
	)
}

const reblogIcon = (status: Entity.Status): ReactElement => {
	if (status.reblogged) return <Icon as={BsRepeat} color="green" />
	switch (status.visibility) {
		case 'direct':
			return <Icon as={BsEnvelope} />
		case 'private':
			return <Icon as={BsLock} />
		default:
			return <Icon as={BsRepeat} />
	}
}

const favouriteIcon = (status: Entity.Status): ReactElement => {
	if (status.favourited) {
		return <Icon as={BsStarFill} color="orange" />
	}
	return <Icon as={BsStar} />
}

const bookmarkIcon = (status: Entity.Status): ReactElement => {
	if (status.bookmarked) return <Icon as={BsFillBookmarkFill} color="red" />
	return <Icon as={BsBookmark} />
}

type DetailMenuProps = {
	className: string
	left?: number
	top?: number
	own: boolean
	status: Entity.Status
	disabled: boolean
	openBrowser: () => void
	copyLink: () => void
	onDelete: () => void
	openEdit: () => void
	onClose: (delay?: number) => NodeJS.Timeout | void
	ableToRevoke: boolean
	onRevokeQuoting: () => void
	onReport: () => void
	onFromOtherAccount: () => void
	translateIt?: () => void
}

const detailMenu = (props: DetailMenuProps, ref: React.RefCallback<HTMLElement>) => {
	const { left, top, className, status } = props

	const handleSelect = async (eventKey: string) => {
		props.onClose()
		switch (eventKey) {
			case 'browser':
				props.openBrowser()
				return
			case 'copy':
				props.copyLink()
				return
			case 'edit':
				props.openEdit()
				return
			case 'delete':
				props.onDelete()
				return
			case 'revoke':
				props.onRevokeQuoting()
				return
			case 'report':
				props.onReport()
				return
			case 'from_other_account':
				props.onFromOtherAccount()
				return
			case 'translate':
				props.translateIt()
				return
		}
	}

	return (
		<Popover className={className} ref={ref} style={{ left, top, padding: 0 }}>
			<Dropdown.Menu onSelect={handleSelect}>
				<Dropdown.Item eventKey="browser" style={{ fontSize: '0.8rem', padding: '5px' }}>
					<FormattedMessage id="timeline.actions.detail.browser" />
				</Dropdown.Item>
				<Dropdown.Item eventKey="copy" style={{ fontSize: '0.8rem', padding: '5px' }}>
					<FormattedMessage id="timeline.actions.detail.copy" />
				</Dropdown.Item>
				{props.own && (
					<Dropdown.Item disabled={props.disabled} eventKey="edit" style={{ fontSize: '0.8rem', padding: '5px' }}>
						<FormattedMessage id="timeline.actions.detail.edit" />
					</Dropdown.Item>
				)}
				{props.own && (
					<Dropdown.Item disabled={props.disabled} eventKey="delete" style={{ fontSize: '0.8rem', padding: '5px' }}>
						<FormattedMessage id="timeline.actions.detail.delete" />
					</Dropdown.Item>
				)}
				<Dropdown.Item disabled={props.disabled} eventKey="report" style={{ fontSize: '0.8rem', padding: '5px' }}>
					<FormattedMessage id="timeline.actions.detail.report" values={{ user: `@${status.account.username}` }} />
				</Dropdown.Item>
				{props.ableToRevoke && (
					<Dropdown.Item eventKey="revoke" style={{ fontSize: '0.8rem', padding: '5px' }}>
						<FormattedMessage id="timeline.actions.revokeQuoting" />
					</Dropdown.Item>
				)}
				<Dropdown.Item eventKey="from_other_account" style={{ fontSize: '0.8rem', padding: '5px' }}>
					<FormattedMessage id="timeline.actions.detail.fromOtherAccount" />
				</Dropdown.Item>
				{props.translateIt && (
					<Dropdown.Item eventKey="translate" style={{ fontSize: '0.8rem', padding: '5px' }}>
						<FormattedMessage id="timeline.actions.detail.translate" />
					</Dropdown.Item>
				)}
			</Dropdown.Menu>
		</Popover>
	)
}

export default Actions
