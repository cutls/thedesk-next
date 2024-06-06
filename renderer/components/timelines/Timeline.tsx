import { Icon } from '@rsuite/icons'
import generator, { type Entity, type MegalodonInterface } from 'megalodon'
import parse from 'parse-link-header'
import { forwardRef, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { BsArrowClockwise, BsBookmark, BsChevronLeft, BsChevronRight, BsGlobe2, BsHash, BsHouseDoor, BsListUl, BsPeople, BsSliders, BsStar, BsX } from 'react-icons/bs'
import { Virtuoso } from 'react-virtuoso'
import { Avatar, Button, Container, Content, Divider, FlexboxGrid, Header, List, Loader, Popover, Radio, RadioGroup, Whisper, useToaster } from 'rsuite'

import alert from '@/components/utils/alert'
import { TIMELINE_MAX_STATUSES, TIMELINE_STATUSES_COUNT } from '@/defaults'
import type { Account } from '@/entities/account'
import type { CustomEmojiCategory } from '@/entities/emoji'
import { Instruction } from '@/entities/instruction'
import type { Server } from '@/entities/server'
import { type Timeline, type TimelineKind, columnWidth } from '@/entities/timeline'
import type {
	DeleteHomeStatusPayload,
	DeleteTimelineStatusPayload,
	ReceiveHomeStatusPayload,
	ReceiveHomeStatusUpdatePayload,
	ReceiveTimelineStatusPayload,
	ReceiveTimelineStatusUpdatePayload,
} from '@/payload'
import { StreamingContext } from '@/streaming'
import { mapCustomEmojiCategory } from '@/utils/emojiData'
import FailoverImg from '@/utils/failoverImg'
import timelineName from '@/utils/timelineName'
import { useRouter } from 'next/router'
import { FormattedMessage, useIntl } from 'react-intl'
import { getAccount, removeTimeline } from 'utils/storage'
import Status from './status/Status'

type Props = {
	timeline: Timeline
	server: Server
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	openReport: (status: Entity.Status, client: MegalodonInterface) => void
	openFromOtherAccount: (status: Entity.Status) => void
}

export default function TimelineColumn(props: Props) {
	const { formatMessage } = useIntl()
	const { listen } = useContext(StreamingContext)

	const [statuses, setStatuses] = useState<Array<Entity.Status>>([])
	const [unreadStatuses, setUnreadStatuses] = useState<Array<Entity.Status>>([])
	const [firstItemIndex, setFirstItemIndex] = useState(TIMELINE_MAX_STATUSES)
	const [account, setAccount] = useState<Account | null>(null)
	const [client, setClient] = useState<MegalodonInterface>()
	const [loading, setLoading] = useState<boolean>(false)
	// This parameter is used only favourite. Because it is not receive streaming, and max_id in link header is required for favourite.
	const [nextMaxId, setNextMaxId] = useState<string | null>(null)
	const [walkthrough, setWalkthrough] = useState<boolean>(false)
	const [customEmojis, setCustomEmojis] = useState<Array<CustomEmojiCategory>>([])
	const [filters, setFilters] = useState<Array<Entity.Filter>>([])

	const scrollerRef = useRef<HTMLElement | null>(null)
	const triggerRef = useRef(null)
	const replyOpened = useRef<boolean>(false)
	const toast = useToaster()
	const router = useRouter()
	const appending = useRef(true)

	useEffect(() => {
		const f = async () => {
			setLoading(true)
			let client: MegalodonInterface
			if (props.server.account_id) {
				const [account, _] = await getAccount({ id: props.server.account_id })
				setAccount(account)
				client = generator(props.server.sns, props.server.base_url, account.access_token, 'Fedistar')
				setClient(client)
				const f = await loadFilter(props.timeline, client)
				setFilters(f)
			} else {
				client = generator(props.server.sns, props.server.base_url, undefined, 'Fedistar')
				setClient(client)
			}
			try {
				const res = await loadTimeline(props.timeline, client)
				setStatuses(res)
			} catch (err) {
				console.error(err)
				toast.push(alert('error', formatMessage({ id: 'alert.failed_load' }, { timeline: `${props.timeline.name} timeline` })), {
					placement: 'topStart',
				})
			} finally {
				setLoading(false)
			}

			const emojis = await client.getInstanceCustomEmojis()
			setCustomEmojis(mapCustomEmojiCategory(props.server.domain, emojis.data))
		}
		f()

		if (props.timeline.kind === 'home') {
			listen<ReceiveHomeStatusPayload>('receive-home-status', (ev) => {
				if (ev.payload.server_id !== props.server.id) {
					return
				}

				if (replyOpened.current || (scrollerRef.current && scrollerRef.current.scrollTop > 10)) {
					setUnreadStatuses((last) => prependStatus(last, ev.payload.status))
					return
				}

				setStatuses((last) => appendStatus(last, ev.payload.status))
			})

			listen<ReceiveHomeStatusUpdatePayload>('receive-home-status-update', (ev) => {
				if (ev.payload.server_id !== props.server.id) {
					return
				}

				setUnreadStatuses((last) => updateStatus(last, ev.payload.status))
				setStatuses((last) => updateStatus(last, ev.payload.status))
			})

			listen<DeleteHomeStatusPayload>('delete-home-status', (ev) => {
				if (ev.payload.server_id !== props.server.id) {
					return
				}
				setUnreadStatuses((last) => deleteStatus(last, ev.payload.status_id))
				setStatuses((last) => deleteStatus(last, ev.payload.status_id))
			})
		} else {
			listen<ReceiveTimelineStatusPayload>('receive-timeline-status', (ev) => {
				if (ev.payload.timeline_id !== props.timeline.id) {
					return
				}

				if (replyOpened.current || (scrollerRef.current && scrollerRef.current.scrollTop > 10)) {
					setUnreadStatuses((last) => prependStatus(last, ev.payload.status))
					return
				}

				setStatuses((last) => appendStatus(last, ev.payload.status))
			})

			listen<ReceiveTimelineStatusUpdatePayload>('receive-timeline-status-update', (ev) => {
				if (ev.payload.timeline_id !== props.timeline.id) {
					return
				}

				setUnreadStatuses((last) => updateStatus(last, ev.payload.status))
				setStatuses((last) => updateStatus(last, ev.payload.status))
			})

			listen<DeleteTimelineStatusPayload>('delete-timeline-status', (ev) => {
				if (ev.payload.timeline_id !== props.timeline.id) {
					return
				}
				setUnreadStatuses((last) => deleteStatus(last, ev.payload.status_id))
				setStatuses((last) => deleteStatus(last, ev.payload.status_id))
			})
		}
	}, [])

	useEffect(() => {
		if (!replyOpened.current) {
			prependUnreads()
		}
	}, [replyOpened.current])

	const loadFilter = async (tl: Timeline, client: MegalodonInterface): Promise<Array<Entity.Filter>> => {
		try {
			const res = await client.getFilters()
			let context = 'home'
			switch (tl.kind) {
				case 'home':
					context = 'home'
					break
				case 'local':
				case 'public':
					context = 'public'
					break
				default:
					context = 'home'
					break
			}
			return res.data.filter((f) => f.context.includes(context))
		} catch (err) {
			console.warn(err)
		}
	}

	const loadTimeline = async (tl: Timeline, client: MegalodonInterface, maxId?: string): Promise<Array<Entity.Status>> => {
		let options = { limit: TIMELINE_STATUSES_COUNT }
		if (maxId) {
			options = Object.assign({}, options, { max_id: maxId })
		}
		switch (tl.kind) {
			case 'home': {
				const res = await client.getHomeTimeline(options)
				return res.data
			}
			case 'local': {
				const res = await client.getLocalTimeline(options)
				return res.data
			}
			case 'public': {
				const res = await client.getPublicTimeline(options)
				return res.data
			}
			case 'favourites': {
				const res = await client.getFavourites(options)
				const link = parse(res.headers.link)
				if (link !== null && link.next) {
					setNextMaxId(link.next.max_id)
				}
				return res.data
			}
			case 'list': {
				if (tl.list_id) {
					const res = await client.getListTimeline(tl.list_id, options)
					return res.data
				}
				return []
			}
			case 'bookmarks': {
				const res = await client.getBookmarks(options)
				const link = parse(res.headers.link)
				if (link !== null && link.next) {
					setNextMaxId(link.next.max_id)
				}
				return res.data
			}
			case 'tag': {
				const res = await client.getTagTimeline(tl.name, options)
				return res.data
			}
			default:
		}
	}

	const reload = useCallback(async () => {
		try {
			setLoading(true)
			const res = await loadTimeline(props.timeline, client)
			setStatuses(res)
		} catch (err) {
			console.error(err)
			toast.push(alert('error', formatMessage({ id: 'alert.failed_load' }, { timeline: `${props.timeline.name} timeline` })), {
				placement: 'topStart',
			})
		} finally {
			setLoading(false)
		}
	}, [client, props.timeline])

	const timelineIcon = (kind: TimelineKind) => {
		switch (kind) {
			case 'home':
				return <Icon as={BsHouseDoor} />
			case 'local':
				return <Icon as={BsPeople} />
			case 'public':
				return <Icon as={BsGlobe2} />
			case 'favourites':
				return <Icon as={BsStar} />
			case 'list':
				return <Icon as={BsListUl} />
			case 'bookmarks':
				return <Icon as={BsBookmark} />
			case 'tag':
				return <Icon as={BsHash} />
		}
	}

	const closeOptionPopover = () => triggerRef?.current.close()

	const updateStatus = (current: Array<Entity.Status>, status: Entity.Status) => {
		const renew = current.map((s) => {
			if (s.id === status.id) {
				return status
			} else if (s.reblog && s.reblog.id === status.id) {
				return Object.assign({}, s, { reblog: status })
			} else if (status.reblog && s.id === status.reblog.id) {
				return status.reblog
			} else if (status.reblog && s.reblog && s.reblog.id === status.reblog.id) {
				return Object.assign({}, s, { reblog: status.reblog })
			} else {
				return s
			}
		})
		return renew
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

	const closeWalkthrough = async () => {
		setWalkthrough(false)
		//await invoke('update_instruction', { step: 2 })
	}

	const loadMore = useCallback(async () => {
		if (!appending.current) return
		console.debug('appending', props.timeline)
		let maxId = null
		switch (props.timeline.kind) {
			case 'favourites':
			case 'bookmarks':
				if (!nextMaxId) {
					return
				}
				maxId = nextMaxId
				break
			default:
				maxId = statuses[statuses.length - 1].id
				break
		}

		try {
			const append = await loadTimeline(props.timeline, client, maxId)
			appending.current = append.length > 0
			setStatuses((last) => [...last, ...append])
		} catch (err) {
			console.error(err)
		}
	}, [client, statuses, setStatuses, nextMaxId])

	const prependUnreads = useCallback(() => {
		console.debug('prepending', props.timeline)
		const unreads = unreadStatuses.slice().reverse().slice(0, TIMELINE_STATUSES_COUNT).reverse()
		const remains = unreadStatuses.slice(0, -1 * TIMELINE_STATUSES_COUNT)
		setUnreadStatuses(() => remains)
		setFirstItemIndex(() => firstItemIndex - unreads.length)
		setStatuses(() => [...unreads, ...statuses])
		return false
	}, [firstItemIndex, statuses, setStatuses, unreadStatuses])

	const backToTop = () => {
		scrollerRef.current.scrollTo({
			top: 0,
			behavior: 'smooth',
		})
	}

	return (
		<div style={{ width: columnWidth(props.timeline.column_width), minWidth: columnWidth(props.timeline.column_width), margin: '0 4px' }}>
			<Container style={{ height: '100%' }}>
				<Header style={{ backgroundColor: 'var(--rs-bg-card)' }}>
					<FlexboxGrid align="middle" justify="space-between">
						<FlexboxGrid.Item style={{ width: 'calc(100% - 80px)' }}>
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
									{timelineIcon(props.timeline.kind)}
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
									title={timelineName(props.timeline.kind, props.timeline.name, formatMessage) + '@' + props.server.domain}
								>
									{timelineName(props.timeline.kind, props.timeline.name, formatMessage)}
									<span style={{ fontSize: '14px', color: 'var(--rs-text-secondary)' }}>@{props.server.domain}</span>
								</FlexboxGrid.Item>
							</FlexboxGrid>
						</FlexboxGrid.Item>
						<FlexboxGrid.Item style={{ width: '80px' }}>
							<FlexboxGrid align="middle" justify="end">
								<FlexboxGrid.Item>
									<Button appearance="link" onClick={reload} style={{ padding: '4px' }} title={formatMessage({ id: 'timeline.reload' })}>
										<Icon as={BsArrowClockwise} />
									</Button>
								</FlexboxGrid.Item>

								<FlexboxGrid.Item>
									{walkthrough && (
										<div style={{ position: 'relative' }}>
											<Popover arrow={false} visible={walkthrough} style={{ left: 0, top: 30 }}>
												<div style={{ width: '120px' }}>
													<h4 style={{ fontSize: '1.2em' }}>
														<FormattedMessage id="walkthrough.timeline.settings.title" />
													</h4>
													<p>
														<FormattedMessage id="walkthrough.timeline.settings.description" />
													</p>
												</div>
												<FlexboxGrid justify="end">
													<Button appearance="default" size="xs" onClick={closeWalkthrough}>
														<FormattedMessage id="walkthrough.timeline.settings.ok" />
													</Button>
												</FlexboxGrid>
											</Popover>
										</div>
									)}
									<Whisper
										trigger="click"
										placement="bottomEnd"
										controlId="option-popover"
										ref={triggerRef}
										onOpen={closeWalkthrough}
										speaker={<OptionPopover timeline={props.timeline} close={closeOptionPopover} />}
									>
										<Button appearance="link" style={{ padding: '4px 8px 4px 4px' }} title={formatMessage({ id: 'timeline.settings.title' })}>
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
						<List
							style={{
								width: '100%',
								height: '100%',
							}}
						>
							<Virtuoso
								style={{ height: '100%' }}
								data={statuses}
								scrollerRef={(ref) => {
									scrollerRef.current = ref as HTMLElement
								}}
								className="timeline-scrollable"
								firstItemIndex={firstItemIndex}
								atTopStateChange={prependUnreads}
								endReached={loadMore}
								overscan={TIMELINE_STATUSES_COUNT}
								defaultItemHeight={44}
								itemContent={(_, status) => (
									<List.Item key={status.id} style={{ paddingTop: '2px', paddingBottom: '2px', backgroundColor: 'var(--rs-bg-card)' }}>
										<Status
											status={status}
											client={client}
											server={props.server}
											account={account}
											columnWidth={props.timeline.column_width}
											updateStatus={(status) => setStatuses((current) => updateStatus(current, status))}
											openMedia={props.openMedia}
											setReplyOpened={(opened) => (replyOpened.current = opened)}
											setStatusDetail={setStatusDetail}
											setAccountDetail={setAccountDetail}
											setTagDetail={setTagDetail}
											openReport={props.openReport}
											openFromOtherAccount={props.openFromOtherAccount}
											customEmojis={customEmojis}
											filters={filters}
										/>
									</List.Item>
								)}
							/>
						</List>
					</Content>
				)}
			</Container>
		</div>
	)
}

const OptionPopover = forwardRef<HTMLDivElement, { timeline: Timeline; close: () => void }>((props, ref) => {
	const { timelineRefresh } = useContext(StreamingContext)
	const removeTimelineFn = async (timeline: Timeline) => {
		removeTimeline(timeline)
		timelineRefresh()
		//await invoke('remove_timeline', { id: timeline.id })
	}

	const switchLeftTimeline = async (timeline: Timeline) => {
		// await invoke('switch_left_timeline', { id: timeline.id })
		props.close()
	}

	const switchRightTimeline = async (timeline: Timeline) => {
		//await invoke('switch_right_timeline', { id: timeline.id })
		props.close()
	}

	const updateColumnWidth = async (timeline: Timeline, columnWidth: string) => {
		//await invoke('update_column_width', { id: timeline.id, columnWidth: columnWidth })
		props.close()
	}

	return (
		<Popover ref={ref} style={{ opacity: 1 }}>
			<div style={{ display: 'flex', flexDirection: 'column', width: '220px' }}>
				<label>
					<FormattedMessage id="timeline.settings.column_width" />
				</label>
				<RadioGroup inline value={props.timeline.column_width} onChange={(value) => updateColumnWidth(props.timeline, value.toString())}>
					<Radio value="xs">xs</Radio>
					<Radio value="sm">sm</Radio>
					<Radio value="md">md</Radio>
					<Radio value="lg">lg</Radio>
				</RadioGroup>
				<Divider style={{ margin: '16px 0' }} />
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
						<Button appearance="link" size="xs" onClick={() => switchRightTimeline(props.timeline)}>
							<Icon as={BsChevronRight} />
						</Button>
					</FlexboxGrid.Item>
				</FlexboxGrid>
			</div>
		</Popover>
	)
})

const prependStatus = (statuses: Array<Entity.Status>, status: Entity.Status): Array<Entity.Status> => {
	if (statuses.find((s) => s.id === status.id && s.uri === status.uri)) {
		return statuses
	}
	return [status].concat(statuses)
}

const appendStatus = (statuses: Array<Entity.Status>, status: Entity.Status): Array<Entity.Status> => {
	if (statuses.find((s) => s.id === status.id && s.uri === status.uri)) {
		return statuses
	}
	return [status].concat(statuses).slice(0, TIMELINE_STATUSES_COUNT)
}

const deleteStatus = (statuses: Array<Entity.Status>, deleted_id: string): Array<Entity.Status> => {
	return statuses.filter((status) => {
		if (status.reblog !== null && status.reblog.id === deleted_id) {
			return false
		} else {
			return status.id !== deleted_id
		}
	})
}
