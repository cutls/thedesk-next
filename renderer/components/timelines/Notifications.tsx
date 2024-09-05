import generator, { type MegalodonInterface, type Entity } from '@cutls/megalodon'
import { Icon } from '@rsuite/icons'
import { type CSSProperties, type Dispatch, type SetStateAction, forwardRef, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { BsArrowClockwise, BsBell, BsCheck2, BsChevronLeft, BsChevronRight, BsSliders, BsSquare, BsViewStacked, BsX } from 'react-icons/bs'
import { Virtuoso } from 'react-virtuoso'
import { Avatar, Button, Container, Content, Divider, Dropdown, FlexboxGrid, Header, List, Loader, Popover, Radio, RadioGroup, Stack, Whisper, useToaster } from 'rsuite'

import alert from '@/components/utils/alert'
import { TheDeskContext } from '@/context'
import { TIMELINE_MAX_STATUSES, TIMELINE_STATUSES_COUNT } from '@/defaults'
import type { Account } from '@/entities/account'
import type { CustomEmojiCategory } from '@/entities/emoji'
import type { Marker } from '@/entities/marker'
import type { Server } from '@/entities/server'
import { type ColumnWidth, type Timeline, colorList, columnWidth as columnWidthCalc, columnWidthSet } from '@/entities/timeline'
import type { Unread } from '@/entities/unread'
import type { ReceiveNotificationPayload } from '@/payload'
import { mapCustomEmojiCategory } from '@/utils/emojiData'
import FailoverImg from '@/utils/failoverImg'
import timelineName from '@/utils/timelineName'
import { useRouter } from 'next/router'
import { FormattedMessage, useIntl } from 'react-intl'
import { ResizableBox } from 'react-resizable'
import { getAccount, removeTimeline, updateColumnColor, updateColumnOrder, updateColumnStack, updateColumnWidth } from 'utils/storage'
import Notification from './notification/Notification'

type Props = {
	timeline: Timeline
	server: Server
	unreads: Array<Unread>
	setUnreads: Dispatch<SetStateAction<Array<Unread>>>
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	openReport: (status: Entity.Status, client: MegalodonInterface) => void
	openFromOtherAccount: (status: Entity.Status) => void
}
const Notifications: React.FC<Props> = (props) => {
	const { formatMessage } = useIntl()
	const { listen, timelineConfig } = useContext(TheDeskContext)
	const [account, setAccount] = useState<Account>()
	const [client, setClient] = useState<MegalodonInterface>()
	const [notifications, setNotifications] = useState<Array<Entity.Notification>>([])
	const [unreadNotifications, setUnreadNotifications] = useState<Array<Entity.Notification>>([])
	const [firstItemIndex, setFirstItemIndex] = useState(TIMELINE_MAX_STATUSES)
	const [loading, setLoading] = useState<boolean>(false)
	const [marker, setMarker] = useState<Marker | null>(null)
	const [pleromaUnreads, setPleromaUnreads] = useState<Array<string>>([])
	const [customEmojis, setCustomEmojis] = useState<Array<CustomEmojiCategory>>([])
	const [filters, setFilters] = useState<Array<Entity.Filter>>([])
	const [columnWidth, setColumnWidth] = useState(columnWidthCalc(props.timeline.column_width))

	const scrollerRef = useRef<HTMLElement | null>(null)
	const triggerRef = useRef(null)
	const replyOpened = useRef<boolean>(false)
	const toast = useToaster()
	const router = useRouter()

	const actionText = (notification: Entity.Notification) => {
		const useName = notification.account.display_name || notification.account.username
		switch (notification.type) {
			case 'favourite':
				return formatMessage({ id: 'timeline.notification.favourite.body' }, { user: useName })
			case 'reblog':
				return formatMessage({ id: 'timeline.notification.reblog.body' }, { user: useName })
			case 'poll_expired':
				return formatMessage({ id: 'timeline.notification.poll_expired.body' }, { user: useName })
			case 'poll_vote':
				return formatMessage({ id: 'timeline.notification.poll_vote.body' }, { user: useName })
			case 'quote':
				return formatMessage({ id: 'timeline.notification.quote.body' }, { user: useName })
			case 'status':
				return formatMessage({ id: 'timeline.notification.status.body' }, { user: useName })
			case 'update':
				return formatMessage({ id: 'timeline.notification.update.body' }, { user: useName })
			case 'emoji_reaction':
			case 'reaction':
				return formatMessage({ id: 'timeline.notification.emoji_reaction.body' }, { user: useName })
			default:
				return null
		}
	}

	useEffect(() => {
		const f = async () => {
			setLoading(true)
			const [account, _] = await getAccount({ id: props.server.account_id })
			setAccount(account)
			const cli = generator(props.server.sns, props.server.base_url, account.access_token, 'Fedistar')
			setClient(cli)
			const f = await loadFilter(cli)
			setFilters(f)
			try {
				const res = await loadNotifications(cli)
				setNotifications(res)
			} catch {
				toast.push(alert('error', formatMessage({ id: 'alert.failed_load' }, { timeline: 'notifications' })), { placement: 'topStart' })
			} finally {
				setLoading(false)
			}
			updateMarker(cli)
			const emojis = await cli.getInstanceCustomEmojis()
			setCustomEmojis(mapCustomEmojiCategory(props.server.domain, emojis.data))

			listen<ReceiveNotificationPayload>('receive-notification', (ev) => {
				if (ev.payload.server_id !== props.server.id) {
					return
				}
				updateMarker(cli)
				if (timelineConfig.notification !== 'no') {
					new window.Notification(`TheDesk: ${account.username}@${props.server.domain}`, {
						body: actionText(ev.payload.notification),
					})
				}
				if (replyOpened.current || (scrollerRef.current && scrollerRef.current.scrollTop > 10)) {
					setUnreadNotifications((last) => {
						if (last.find((n) => n.id === ev.payload.notification.id)) {
							return last
						}
						return [ev.payload.notification].concat(last)
					})
					return
				}

				setNotifications((last) => {
					if (last.find((n) => n.id === ev.payload.notification.id)) {
						return last
					}
					return [ev.payload.notification].concat(last).slice(0, TIMELINE_STATUSES_COUNT)
				})
			})
		}
		f()
		setColumnWidth(columnWidthCalc(props.timeline.column_width))
	}, [props.timeline])

	useEffect(() => {
		if (!replyOpened.current) {
			prependUnreads()
		}
	}, [replyOpened.current])

	useEffect(() => {
		// In pleroma, last_read_id is incorrect.
		// Items that have not been marked may also be read. So, if marker has unread_count, we should use it for unreads.
		if (marker && marker.unread_count) {
			const allNotifications = unreadNotifications.concat(notifications)
			const unreads = allNotifications.slice(0, marker.unread_count).map((n) => n.id)
			setPleromaUnreads(unreads)
		}
	}, [marker, unreadNotifications, notifications])

	const loadFilter = async (client: MegalodonInterface): Promise<Array<Entity.Filter>> => {
		try {
			const res = await client.getFilters()
			return res.data.filter((f) => f.context.includes('notifications'))
		} catch (err) {
			console.warn(err)
		}
	}

	const loadNotifications = async (client: MegalodonInterface, maxId?: string): Promise<Array<Entity.Notification>> => {
		let options = { limit: TIMELINE_STATUSES_COUNT }
		if (maxId) {
			options = Object.assign({}, options, { max_id: maxId })
		}
		const res = await client.getNotifications(options)
		return res.data.filter((n) => !!n.account)
	}

	const closeOptionPopover = () => triggerRef?.current.close()

	const updateStatus = (status: Entity.Status) => {
		const renew = notifications.map((n) => {
			if (n.status === undefined || n.status === null) {
				return n
			}
			if (n.status.id === status.id) {
				return Object.assign({}, n, { status })
			}
			if (n.status.reblog && n.status.reblog.id === status.id) {
				const s = Object.assign({}, n.status, { reblog: status })
				return Object.assign({}, n, { status: s })
			}
			return n
		})
		setNotifications(renew)
	}

	const setStatusDetail = (statusId: string, serverId: number, accountId?: number) => {
		if (accountId) {
			router.push({ query: { status_id: statusId, server_id: serverId, account_id: accountId } })
		} else {
			router.push({ query: { status_id: statusId, server_id: serverId } })
		}
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

	const updateMarker = async (cli: MegalodonInterface) => {
		try {
			const res = await cli.getMarkers(['notifications'])
			const marker = res.data as Entity.Marker
			if (marker.notifications) {
				setMarker(marker.notifications)
			}
		} catch (err) {
			console.error(err)
		}
	}

	const read = async () => {
		props.setUnreads((current) => {
			const updated = current.map((u) => {
				if (u.server_id === props.server.id) {
					return Object.assign({}, u, { count: 0 })
				}
				return u
			})

			return updated
		})

		// Update maker for server-side
		try {
			await client.saveMarkers({ notifications: { last_read_id: notifications[0].id } })
			if (props.server.sns === 'pleroma') {
				await client.readNotifications({ max_id: notifications[0].id })
			}
			await updateMarker(client)
		} catch {
			toast.push(alert('error', formatMessage({ id: 'alert.failed_mark' })), { placement: 'topStart' })
		}
	}

	const reload = useCallback(async () => {
		try {
			setLoading(true)
			const res = await loadNotifications(client)
			setNotifications(res)
		} catch (err) {
			console.error(err)
			toast.push(alert('error', formatMessage({ id: 'alert.failed_load' }, { timeline: 'notifications' })), { placement: 'topStart' })
		} finally {
			setLoading(false)
		}
	}, [client, props.timeline])

	const loadMore = useCallback(async () => {
		console.debug('appending')
		try {
			const append = await loadNotifications(client, notifications[notifications.length - 1].id)
			setNotifications((last) => [...last, ...append])
		} catch (err) {
			console.error(err)
		}
	}, [client, notifications, setNotifications])

	const prependUnreads = useCallback(() => {
		console.debug('prepending')
		const unreads = unreadNotifications.slice().reverse().slice(0, TIMELINE_STATUSES_COUNT).reverse()
		const remains = unreadNotifications.slice(0, -1 * TIMELINE_STATUSES_COUNT)
		setUnreadNotifications(() => remains)
		setFirstItemIndex(() => firstItemIndex - unreads.length)
		setNotifications(() => [...unreads, ...notifications])
		return false
	}, [firstItemIndex, notifications, setNotifications, unreadNotifications])

	const backToTop = () => {
		scrollerRef.current.scrollTo({
			top: 0,
			behavior: 'smooth',
		})
	}
	const columnWidthSet = (widthRaw: number) => {
		const width = Math.round(widthRaw / 50) * 50
		updateColumnWidth({ id: props.timeline.id, columnWidth: width })
		setColumnWidth(width)
	}
	const headerStyle: CSSProperties = {
		backgroundColor: props.timeline.color ? `var(--rs-color-${props.timeline.color})` : 'var(--rs-color-card)',
		borderBottomWidth: '3px',
		borderBottomStyle: 'solid',
		borderBottomColor: account && account.color ? `var(--rs-color-${account.color})` : 'transparent',
	}

	return (
		<ResizableBox
			width={columnWidth}
			height={0}
			axis="x"
			style={{ margin: '0 4px', minHeight: '100%', flexShrink: 0, width: columnWidth }}
			resizeHandles={['e']}
			onResizeStop={(_, e) => columnWidthSet(e.size.width)}
			className={`timeline notifications notification${props.timeline.id}`}
		>
			<Container style={{ height: '100%' }}>
				<Header style={headerStyle}>
					<FlexboxGrid align="middle" justify="space-between">
						<FlexboxGrid.Item style={{ width: 'calc(100% - 108px)' }}>
							<FlexboxGrid align="middle" onClick={backToTop} style={{ cursor: 'pointer' }}>
								{/** icon **/}
								<FlexboxGrid.Item
									style={{
										lineHeight: '48px',
										fontSize: '18px',
										paddingRight: '8px',
										paddingLeft: '8px',
										paddingBottom: '6px',
										width: '42px',
									}}
								>
									<Icon as={BsBell} />
								</FlexboxGrid.Item>
								{/** name **/}
								<FlexboxGrid.Item
									style={{
										lineHeight: '48px',
										fontSize: '18px',
										verticalAlign: 'middle',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
										width: 'calc(100% - 42px)',
									}}
									title={`${timelineName(props.timeline.kind, props.timeline.name, formatMessage)}@${props.server.domain}`}
								>
									{timelineName(props.timeline.kind, props.timeline.name, formatMessage)}
									<span style={{ fontSize: '14px' }}>@{props.server.domain}</span>
								</FlexboxGrid.Item>
							</FlexboxGrid>
						</FlexboxGrid.Item>
						<FlexboxGrid.Item style={{ width: '108px' }}>
							<FlexboxGrid align="middle" justify="end">
								<FlexboxGrid.Item>
									<Button
										appearance="subtle"
										title={formatMessage({ id: 'timeline.mark_as_read' })}
										disabled={!props.unreads.find((u) => u.server_id === props.server.id && u.count > 0)}
										onClick={read}
										style={{ padding: '4px' }}
									>
										<Icon as={BsCheck2} />
									</Button>
								</FlexboxGrid.Item>
								<FlexboxGrid.Item>
									<Button appearance="subtle" onClick={reload} style={{ padding: '4px' }} title={formatMessage({ id: 'timeline.reload' })}>
										<Icon as={BsArrowClockwise} />
									</Button>
								</FlexboxGrid.Item>
								<FlexboxGrid.Item>
									<Whisper trigger="click" placement="bottomEnd" controlId="option-popover" ref={triggerRef} speaker={<OptionPopover timeline={props.timeline} close={closeOptionPopover} />}>
										<Button appearance="subtle" style={{ padding: '4px 8px 4px 4px' }} title={formatMessage({ id: 'timeline.settings.title' })}>
											<Icon as={BsSliders} />
										</Button>
									</Whisper>
								</FlexboxGrid.Item>
								<FlexboxGrid.Item style={{ paddingRight: '8px', height: '20px' }}>
									<Avatar circle src={FailoverImg(account ? account.avatar : null)} size="xs" title={account ? account.username : ''} />
								</FlexboxGrid.Item>
							</FlexboxGrid>
						</FlexboxGrid.Item>
					</FlexboxGrid>
				</Header>

				{loading ? (
					<Loader style={{ margin: '10em auto' }} />
				) : (
					<Content style={{ height: 'calc(100% - 54px)' }}>
						<List hover style={{ width: '100%', height: '100%' }}>
							<Virtuoso
								style={{ height: '100%' }}
								data={notifications}
								scrollerRef={(ref) => {
									scrollerRef.current = ref as HTMLElement
								}}
								className="timeline-scrollable"
								firstItemIndex={firstItemIndex}
								atTopStateChange={prependUnreads}
								endReached={loadMore}
								overscan={TIMELINE_STATUSES_COUNT}
								itemContent={(_, notification) => {
									let shadow = {}
									if (marker) {
										if (marker.unread_count && pleromaUnreads.includes(notification.id)) {
											shadow = { boxShadow: '2px 0 1px var(--rs-primary-700) inset' }
										} else if (Number.parseInt(marker.last_read_id) < Number.parseInt(notification.id)) {
											shadow = { boxShadow: '2px 0 1px var(--rs-primary-700) inset' }
										}
									}
									return (
										<List.Item
											key={notification.id}
											style={Object.assign(
												{
													paddingTop: '2px',
													paddingBottom: '2px',
													backgroundColor: 'var(--rs-bg-well)',
												},
												shadow,
											)}
										>
											<Notification
												notification={notification}
												client={client}
												server={props.server}
												account={account}
												columnWidth={columnWidth}
												updateStatus={updateStatus}
												openMedia={props.openMedia}
												setReplyOpened={(opened) => {
													replyOpened.current = opened
												}}
												setStatusDetail={setStatusDetail}
												setAccountDetail={setAccountDetail}
												setTagDetail={setTagDetail}
												openReport={props.openReport}
												openFromOtherAccount={props.openFromOtherAccount}
												customEmojis={customEmojis}
												filters={filters}
											/>
										</List.Item>
									)
								}}
							/>
						</List>
					</Content>
				)}
			</Container>
		</ResizableBox>
	)
}
const OptionPopover = forwardRef<HTMLDivElement, { timeline: Timeline; close: () => void }>((props, ref) => {
	const { timelineRefresh } = useContext(TheDeskContext)
	const { formatMessage } = useIntl()
	const newRef = useRef()
	const removeTimelineFn = async (timeline: Timeline) => {
		removeTimeline(timeline)
		timelineRefresh()
		//await invoke('remove_timeline', { id: timeline.id })
	}

	const switchLeftTimeline = async (timeline: Timeline) => {
		await updateColumnOrder({ id: timeline.id, direction: 'left' })
		timelineRefresh()
		props.close()
	}

	const switchRightTimeline = async (timeline: Timeline) => {
		await updateColumnOrder({ id: timeline.id, direction: 'left' })
		timelineRefresh()
		props.close()
	}
	const stackTimeline = async (timeline: Timeline) => {
		const res = await updateColumnStack({ id: timeline.id, stack: !timeline.stacked })
		if (!res) return
		timelineRefresh()
		props.close()
	}

	const isColumnWidthGuard = (value: string): value is ColumnWidth => columnWidthSet.includes(value as any)
	const updateColumnWidthFn = async (timeline: Timeline, columnWidth: string) => {
		if (!isColumnWidthGuard(columnWidth)) return
		await updateColumnWidth({ id: timeline.id, columnWidth: columnWidthCalc(columnWidth) })
		timelineRefresh()
		props.close()
	}

	const updateColumnColorFn = async (timeline: Timeline, color: string) => {
		await updateColumnColor({ id: timeline.id, color })
		timelineRefresh()
		props.close()
	}

	return (
		<Popover ref={ref} style={{ opacity: 1 }}>
			<div style={{ display: 'flex', flexDirection: 'column', width: '220px' }}>
				<label>
					<FormattedMessage id="timeline.settings.column_width" />
				</label>
				<RadioGroup inline value={props.timeline.column_width} onChange={(value) => updateColumnWidthFn(props.timeline, value.toString())}>
					<Radio value="xs">xs</Radio>
					<Radio value="sm">sm</Radio>
					<Radio value="md">md</Radio>
					<Radio value="lg">lg</Radio>
				</RadioGroup>

				<Divider style={{ margin: '8px 0' }} />
				<FormattedMessage id="timeline.settings.color" />
				<FlexboxGrid justify="center">
					<Stack wrap spacing={6} style={{ maxWidth: '250px', padding: '5px' }}>
						<Button style={{ textTransform: 'capitalize', width: '30px', height: '30px' }} className="colorChangeBtn" onClick={() => updateColumnColorFn(props.timeline, 'unset')} />
						{colorList.map((c) => (
							<Button
								appearance="primary"
								key={c}
								color={c}
								className="colorChangeBtn"
								style={{ textTransform: 'capitalize', width: '30px', height: '30px' }}
								onClick={() => updateColumnColorFn(props.timeline, c)}
							/>
						))}
					</Stack>
				</FlexboxGrid>
				<Divider style={{ margin: '8px 0' }} />
				<FlexboxGrid justify="space-between">
					<FlexboxGrid.Item>
						<Button appearance="link" size="xs" onClick={() => removeTimelineFn(props.timeline)}>
							<Icon as={BsX} style={{ paddingBottom: '2px', fontSize: '1.4em' }} />
							<span>
								<FormattedMessage id="timeline.settings.unpin" />
							</span>
						</Button>
					</FlexboxGrid.Item>
					<FlexboxGrid.Item>
						<Button appearance="link" size="xs" onClick={() => switchLeftTimeline(props.timeline)}>
							<Icon as={BsChevronLeft} />
						</Button>
						<Button appearance="link" size="xs" onClick={() => stackTimeline(props.timeline)} title={formatMessage({ id: props.timeline.stacked ? 'timeline.settings.unstack' : 'timeline.settings.stack'})}>
							<Icon as={props.timeline.stacked ? BsSquare : BsViewStacked} />
						</Button>
						<Button appearance="link" size="xs" onClick={() => switchRightTimeline(props.timeline)}>
							<Icon as={BsChevronRight} />
						</Button>
					</FlexboxGrid.Item>
				</FlexboxGrid>
			</div>
		</Popover>
	)
})

export default Notifications
