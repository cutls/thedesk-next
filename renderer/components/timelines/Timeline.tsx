import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import { Icon } from '@rsuite/icons'
import { useRouter } from 'next/router'
import parse from 'parse-link-header'
import { type CSSProperties, forwardRef, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
	BsArrowClockwise,
	BsArrowReturnLeft,
	BsArrowUpCircle,
	BsBookmark,
	BsBroadcast,
	BsChevronLeft,
	BsChevronRight,
	BsGlobe2,
	BsHash,
	BsHouseDoor,
	BsLayers,
	BsListUl,
	BsMegaphone,
	BsPeople,
	BsSliders,
	BsSquare,
	BsStar,
	BsViewStacked,
	BsX
} from 'react-icons/bs'
import { FormattedMessage, useIntl } from 'react-intl'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { Avatar, Button, Container, Content, Divider, FlexboxGrid, Header, List, Loader, Popover, Radio, RadioGroup, Stack, useToaster, Whisper } from 'rsuite'
import { removeTimeline, updateColumnColor, updateColumnMediaOnly, updateColumnOrder, updateColumnStack, updateColumnTts, updateColumnWidth } from 'utils/storage'
import alert from '@/components/utils/alert'
import { TheDeskContext, TimelineRefreshContext } from '@/context'
import { TIMELINE_MAX_STATUSES, TIMELINE_STATUSES_COUNT } from '@/defaults'
import type { Account } from '@/entities/account'
import type { CustomEmojiCategory } from '@/entities/emoji'
import type { Server } from '@/entities/server'
import { type ColumnWidth, colorList, columnWidth as columnWidthCalc, columnWidthSet, type Timeline, type TimelineKind } from '@/entities/timeline'
import type {
	DeleteHomeStatusPayload,
	DeleteTimelineStatusPayload,
	ReceiveHomeStatusPayload,
	ReceiveHomeStatusUpdatePayload,
	ReceiveTimelineStatusPayload,
	ReceiveTimelineStatusUpdatePayload
} from '@/payload'
import { mapCustomEmojiCategory } from '@/utils/emojiData'
import FailoverImg from '@/utils/failoverImg'
import timelineName from '@/utils/timelineName'
import { listenTimeline, listenUser, listenTimelineWaiter, listenUserWaiter } from '@/utils/socket'
import { Context } from '@/theme'
import Status from './status/Status'

type Props = {
	timeline: Timeline
	server: Server
	account: Account | null
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	openReport: (status: Entity.Status, client: MegalodonInterface) => void
	openFromOtherAccount: (status: Entity.Status) => void
	wrapIndex: number
}

export default function TimelineColumn(props: Props) {
	const { formatMessage } = useIntl()
	const { timelineConfig } = useContext(TheDeskContext)
	const { timelineRefresh, setTimelineStreamingPaused } = useContext(TimelineRefreshContext)
	const { theme } = useContext(Context)
	const isDark = theme === 'dark'

	const [statuses, setStatuses] = useState<Array<Entity.Status>>([])
	const [unreadStatuses, setUnreadStatuses] = useState<Array<Entity.Status>>([])
	const [firstItemIndex, setFirstItemIndex] = useState(TIMELINE_MAX_STATUSES)
	const [client, setClient] = useState<MegalodonInterface>()
	const [loading, setLoading] = useState<boolean>(false)
	// This parameter is used only favourite. Because it is not receive streaming, and max_id in link header is required for favourite.
	const [nextMaxId, setNextMaxId] = useState<string | null>(null)
	const [walkthrough, setWalkthrough] = useState<boolean>(false)
	const [customEmojis, setCustomEmojis] = useState<Array<CustomEmojiCategory>>([])
	const [filters, setFilters] = useState<Array<Entity.Filter>>([])
	const [columnWidth, setColumnWidth] = useState(columnWidthCalc(props.timeline.column_width))
	const [minIdMode, setMinIdMode] = useState(false)

	const scrollerRef = useRef<HTMLElement | null>(null)
	const virtuosoRef = useRef<VirtuosoHandle | null>(null)
	const triggerRef = useRef(null)
	const replyOpened = useRef<boolean>(false)
	const toast = useToaster()
	const router = useRouter()
	const appending = useRef(true)
	const minIdModeRef = useRef(false)
	const loadingFromMinId = useRef(false)
	const lastRequestedMinId = useRef<string | null>(null)
	const markerMinId = useRef<string | null>(null)
	const scrollToMinIdBoundary = useRef(false)
	const previousView = useRef<{
		statuses: Array<Entity.Status>
		unreadStatuses: Array<Entity.Status>
		firstItemIndex: number
		scrollTop: number
	} | null>(null)
	const statusesRef = useRef(statuses)
	statusesRef.current = statuses
	const account = props.account
	const uniqueTimelineKey = `${props.server.id}-${props.timeline.kind}`
	useEffect(() => {
		return () => {
			if (minIdModeRef.current) void setTimelineStreamingPaused(props.timeline.id, false)
		}
	}, [props.timeline.id])
	useEffect(() => {
		if (loading || !minIdMode || !scrollToMinIdBoundary.current || statuses.length === 0) return

		scrollToMinIdBoundary.current = false
		const frame = requestAnimationFrame(() => {
			virtuosoRef.current?.scrollToIndex({ index: statuses.length - 1, align: 'end' })
		})
		return () => cancelAnimationFrame(frame)
	}, [loading, minIdMode, statuses])
	useEffect(() => {
		if (props.timeline.kind !== 'home' || !client || !account || !window.electronAPI?.onWindowBlur) return

		return window.electronAPI.onWindowBlur(() => {
			const id = statusesRef.current[0]?.id
			if (!id) return
			void client.saveMarkers({ home: { last_read_id: id } }).catch((err) => console.error('failed to update home marker', err))
		})
	}, [account, client, props.timeline.kind])
	useEffect(() => {
		const f = async () => {
			setLoading(true)
			let client: MegalodonInterface
			if (props.server.account_id) {
				client = generator(props.server.sns, props.server.base_url, account?.access_token || '', 'TheDesk(Desktop)')
				setClient(client)
				const f = await loadFilter(props.timeline, client)
				setFilters(f)
			} else {
				client = generator(props.server.sns, props.server.base_url, undefined, 'TheDesk(Desktop)')
				setClient(client)
			}
			try {
				const res = await loadTimeline(props.timeline, client)
				setStatuses(res)
				const emojis = await client.getInstanceCustomEmojis()
				setCustomEmojis(mapCustomEmojiCategory(props.server.domain, emojis.data))
			} catch (err) {
				console.error(err)
				toast.push(alert('error', formatMessage({ id: 'alert.failedLoad' }, { timeline: `${props.timeline.name} timeline` })), {
					placement: 'topStart'
				})
			} finally {
				setLoading(false)
			}
		}
		f()
	}, [uniqueTimelineKey])
	useEffect(() => {
		setColumnWidth(columnWidthCalc(props.timeline.column_width))
		if (props.timeline.kind === 'home') {
			const fn = async () => {
				await listenUserWaiter(props.server.id)
				listenUser<ReceiveHomeStatusPayload>(
					'receive-home-status',
					(ev) => {
						if (ev.payload.server_id !== props.server.id) {
							return
						}

						if (replyOpened.current || (scrollerRef.current && scrollerRef.current.scrollTop > 10)) {
							setUnreadStatuses((last) => prependStatus(last, ev.payload.status))
							return
						}

						setStatuses((last) => appendStatus(last, ev.payload.status))
					},
					timelineConfig,
					props.timeline.tts
				)

				listenUser<ReceiveHomeStatusUpdatePayload>(
					'receive-home-status-update',
					(ev) => {
						if (ev.payload.server_id !== props.server.id) {
							return
						}

						setUnreadStatuses((last) => updateStatus(last, ev.payload.status))
						setStatuses((last) => updateStatus(last, ev.payload.status))
					},
					timelineConfig,
					false
				)

				listenUser<DeleteHomeStatusPayload>(
					'delete-home-status',
					(ev) => {
						if (ev.payload.server_id !== props.server.id) {
							return
						}
						setUnreadStatuses((last) => deleteStatus(last, ev.payload.status_id))
						setStatuses((last) => deleteStatus(last, ev.payload.status_id))
					},
					timelineConfig,
					false
				)
			}
			fn()
		} else {
			const fn = async () => {
				await listenTimelineWaiter(props.timeline.id)
				listenTimeline<ReceiveTimelineStatusPayload>(
					'receive-timeline-status',
					(ev) => {
						if (ev.payload.timeline_id !== props.timeline.id) return
						const status: Entity.Status = ev.payload.status
						if (props.timeline.kind === 'integrated' && ev.kind === 'public:local') status._integrated_isLocal = true
						if (replyOpened.current || (scrollerRef.current && scrollerRef.current.scrollTop > 10)) {
							setUnreadStatuses((last) => prependStatus(last, status))
							return
						}
						setStatuses((last) => appendStatus(last, status))
					},
					timelineConfig,
					props.timeline.tts
				)

				listenTimeline<ReceiveTimelineStatusUpdatePayload>(
					'receive-timeline-status-update',
					(ev) => {
						if (ev.payload.timeline_id !== props.timeline.id) return
						const status: Entity.Status = ev.payload.status
						if (props.timeline.kind === 'integrated' && ev.kind === 'public:local') status._integrated_isLocal = true
						setUnreadStatuses((last) => updateStatus(last, status))
						setStatuses((last) => updateStatus(last, status))
					},
					timelineConfig,
					false
				)

				listenTimeline<DeleteTimelineStatusPayload>(
					'delete-timeline-status',
					(ev) => {
						if (ev.payload.timeline_id !== props.timeline.id) {
							return
						}
						setUnreadStatuses((last) => deleteStatus(last, ev.payload.status_id))
						setStatuses((last) => deleteStatus(last, ev.payload.status_id))
					},
					timelineConfig,
					false
				)
			}
			fn()
		}
	}, [props.timeline])

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
			if (tl.kind === 'integrated') {
				return res.data.filter((f) => f.context.includes('home') || f.context.includes('public'))
			}
			return res.data.filter((f) => f.context.includes(context))
		} catch (err) {
			console.warn(err)
		}
	}

	const loadTimeline = async (tl: Timeline, client: MegalodonInterface, maxId?: string, minId?: string): Promise<Array<Entity.Status>> => {
		let options: { limit: number; max_id?: string; min_id?: string } = { limit: TIMELINE_STATUSES_COUNT }
		if (maxId) {
			options = Object.assign({}, options, { max_id: maxId })
		}
		if (minId) {
			options = Object.assign({}, options, { min_id: minId })
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
					const res = await client.getListTimeline(tl.list_id, options, tl.is_misskey_antenna)
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
			case 'integrated': {
				const res = await client.getIntegratedTimeline(options)
				return res.data
			}
			default:
		}
	}

	const reload = useCallback(async () => {
		try {
			setLoading(true)
			const res = await loadTimeline(props.timeline, client, undefined, minIdMode ? markerMinId.current : undefined)
			if (!minIdMode) timelineRefresh(true)
			setStatuses(res)
		} catch (err) {
			console.error(err)
			toast.push(alert('error', formatMessage({ id: 'alert.failedLoad' }, { timeline: `${props.timeline.name} timeline` })), {
				placement: 'topStart'
			})
		} finally {
			setLoading(false)
		}
	}, [client, props.timeline, minIdMode])

	const loadNewerFromMinId = useCallback(async () => {
		const minId = statuses[0]?.id
		if (!client || !minId || loadingFromMinId.current || lastRequestedMinId.current === minId) return

		loadingFromMinId.current = true
		lastRequestedMinId.current = minId
		try {
			const newer = await loadTimeline(props.timeline, client, undefined, minId)
			setStatuses((current) => {
				const currentIds = new Set(current.map((status) => status.id))
				const unique = newer.filter((status) => !currentIds.has(status.id))
				if (unique.length > 0) setFirstItemIndex((index) => index - unique.length)
				return [...unique, ...current]
			})
		} catch (err) {
			lastRequestedMinId.current = null
			console.error(err)
		} finally {
			loadingFromMinId.current = false
		}
	}, [client, props.timeline, statuses])

	const toggleMinIdMode = useCallback(async () => {
		if (!client || loading || props.timeline.kind !== 'home') return
		setLoading(true)

		if (minIdMode) {
			const savedView = previousView.current
			minIdModeRef.current = false
			setMinIdMode(false)
			lastRequestedMinId.current = null
			markerMinId.current = null
			appending.current = true
			if (savedView) {
				setStatuses(savedView.statuses)
				setUnreadStatuses(savedView.unreadStatuses)
				setFirstItemIndex(savedView.firstItemIndex)
			}
			previousView.current = null
			try {
				await setTimelineStreamingPaused(props.timeline.id, false)
			} catch (err) {
				console.error(err)
				toast.push(alert('error', formatMessage({ id: 'alert.failedLoad' }, { timeline: `${props.timeline.name} timeline` })), {
					placement: 'topStart'
				})
			} finally {
				setLoading(false)
				if (savedView) setTimeout(() => scrollerRef.current?.scrollTo({ top: savedView.scrollTop }), 0)
			}
			return
		}

		previousView.current = {
			statuses,
			unreadStatuses,
			firstItemIndex,
			scrollTop: scrollerRef.current?.scrollTop || 0
		}
		minIdModeRef.current = true
		setMinIdMode(true)
		appending.current = true
		try {
			await setTimelineStreamingPaused(props.timeline.id, true)
			const markers = await client.getMarkers(['home'])
			const minId = (markers.data as Entity.Marker).home?.last_read_id
			if (!minId) throw new Error('The home timeline marker does not contain a last_read_id')
			markerMinId.current = minId
			lastRequestedMinId.current = minId
			const res = await loadTimeline(props.timeline, client, undefined, minId)
			setUnreadStatuses([])
			setFirstItemIndex(TIMELINE_MAX_STATUSES)
			scrollToMinIdBoundary.current = true
			setStatuses(res)
		} catch (err) {
			console.error(err)
			minIdModeRef.current = false
			setMinIdMode(false)
			lastRequestedMinId.current = null
			markerMinId.current = null
			previousView.current = null
			await setTimelineStreamingPaused(props.timeline.id, false)
			toast.push(alert('error', formatMessage({ id: 'alert.failedLoad' }, { timeline: `${props.timeline.name} timeline` })), {
				placement: 'topStart'
			})
		} finally {
			setLoading(false)
		}
	}, [client, firstItemIndex, loading, minIdMode, props.timeline, statuses, unreadStatuses])

	const timelineIcon = (kind: TimelineKind, isMisskeyAntenna: boolean) => {
		if (isMisskeyAntenna) return <Icon as={BsBroadcast} />
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
			case 'integrated':
				return <Icon as={BsLayers} />
		}
	}

	const closeOptionPopover = () => triggerRef?.current.close()

	const updateStatus = (current: Array<Entity.Status>, status: Entity.Status) => {
		const renew = current.map((s) => {
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
		if (!appending.current || statuses.length === 0) return
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
			const append = await loadTimeline(props.timeline, client, maxId, minIdMode ? markerMinId.current : undefined)
			appending.current = append.length > 0
			setStatuses((last) => [...last, ...append])
		} catch (err) {
			console.error(err)
		}
	}, [client, statuses, setStatuses, nextMaxId, minIdMode])

	const prependUnreads = useCallback(() => {
		console.debug('prepending', props.timeline)
		const unreads = unreadStatuses.slice().reverse().slice(0, TIMELINE_STATUSES_COUNT).reverse()
		const remains = unreadStatuses.slice(0, -1 * TIMELINE_STATUSES_COUNT)
		setUnreadStatuses(() => remains)
		setFirstItemIndex(() => firstItemIndex - unreads.length)
		setStatuses(() => [...unreads, ...statuses])
		return false
	}, [firstItemIndex, statuses, setStatuses, unreadStatuses])
	const handleAtTopStateChange = useCallback(
		(atTop: boolean) => {
			if (!atTop) return
			if (minIdMode) {
				void loadNewerFromMinId()
				return
			}
			prependUnreads()
		},
		[minIdMode, loadNewerFromMinId, prependUnreads]
	)

	const backToTop = () => {
		scrollerRef.current.scrollTo({
			top: 0,
			behavior: 'smooth'
		})
	}
	const headerStyle: CSSProperties = {
		backgroundColor: props.timeline.color ? `var(--rs-color-${props.timeline.color})` : isDark ? 'var(--rs-carousel-bg)' : 'var(--rs-bg-backdrop)',
		color: props.timeline.color ? 'white' : undefined,
		borderBottomWidth: '3px',
		borderBottomStyle: 'solid',
		borderBottomColor: account && account.color ? `var(--rs-color-${account.color})` : 'transparent',
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8
	}
	const showMinIdButton = props.timeline.kind === 'home'
	if (!props.server) return null

	return (
		<Container style={{ height: '100%' }}>
			<Header style={headerStyle}>
				<FlexboxGrid align="middle" justify="space-between">
					<FlexboxGrid.Item style={{ width: `calc(100% - ${showMinIdButton ? 108 : 80}px)` }}>
						<FlexboxGrid align="middle" onClick={backToTop} style={{ cursor: 'pointer' }}>
							{/** icon **/}
							<FlexboxGrid.Item
								style={{
									lineHeight: '2em',
									fontSize: '1.2em',
									paddingRight: '8px',
									paddingLeft: '8px',
									paddingBottom: '6px',
									width: 'calc(2.4em - 6px)'
								}}
							>
								{timelineIcon(props.timeline.kind, props.timeline.is_misskey_antenna)}
							</FlexboxGrid.Item>
							{/** name **/}
							<FlexboxGrid.Item
								style={{
									lineHeight: '2em',
									fontSize: '1.2em',
									verticalAlign: 'middle',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
									width: 'calc(100% - 2.4em + 6px)'
								}}
								title={`${timelineName(props.timeline.kind, props.timeline.name, formatMessage)}@${props.server.domain}`}
							>
								{timelineName(props.timeline.kind, props.timeline.name, formatMessage)}
								<span style={{ fontSize: '0.7em', marginLeft: '0.2em' }}>
									{account?.username || ''}@{props.server.domain}
								</span>
							</FlexboxGrid.Item>
						</FlexboxGrid>
					</FlexboxGrid.Item>
					<FlexboxGrid.Item style={{ width: showMinIdButton ? '108px' : '80px' }}>
						<FlexboxGrid align="middle" justify="end">
							{showMinIdButton && (
								<FlexboxGrid.Item>
									<Button
										appearance={minIdMode ? 'primary' : 'subtle'}
										onClick={toggleMinIdMode}
										style={{ padding: '4px' }}
										title={formatMessage({ id: minIdMode ? 'timeline.minId.restore' : 'timeline.minId.show' })}
									>
										<Icon as={minIdMode ? BsArrowReturnLeft : BsArrowUpCircle} />
									</Button>
								</FlexboxGrid.Item>
							)}
							<FlexboxGrid.Item>
								<Button appearance="subtle" onClick={reload} style={{ padding: '4px' }} title={formatMessage({ id: 'timeline.reload' })}>
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
									speaker={<OptionPopover timeline={props.timeline} close={closeOptionPopover} wrapIndex={props.wrapIndex} />}
								>
									<Button appearance="subtle" style={{ padding: '4px 8px 4px 4px' }} title={formatMessage({ id: 'timeline.settings.title' })}>
										<Icon as={BsSliders} />
									</Button>
								</Whisper>
							</FlexboxGrid.Item>
							<FlexboxGrid.Item style={{ paddingRight: '8px', height: '20px' }}>
								<Avatar circle src={FailoverImg(account ? account.avatar : null)} size="xs" title={`${account ? account.username : ''}@${props.server.domain}`} />
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
							height: '100%'
						}}
					>
						<Virtuoso
							ref={virtuosoRef}
							style={{ height: '100%' }}
							data={statuses}
							scrollerRef={(ref) => {
								scrollerRef.current = ref as HTMLElement
							}}
							className="timeline-scrollable"
							firstItemIndex={firstItemIndex}
							atTopStateChange={handleAtTopStateChange}
							endReached={loadMore}
							overscan={TIMELINE_STATUSES_COUNT}
							defaultItemHeight={44}
							itemContent={(_, status) => {
								const statusHasContent = status.reblog ? status.reblog : status
								if (props.timeline.mediaOnly && statusHasContent.media_attachments.length === 0) return null
								if (
									filters
										?.map((f) => [f.phrase, f.irreversible] as [string, boolean])
										.findIndex(([keyword, irreversible]) => (irreversible ? statusHasContent.content.toLowerCase().includes(keyword.toLowerCase()) : false)) >= 0
								)
									return null
								return (
									<List.Item key={status.id} style={{ paddingTop: '2px', paddingBottom: '2px', backgroundColor: 'var(--rs-bg-well)' }}>
										<Status
											status={status}
											client={client}
											server={props.server}
											account={account}
											columnWidth={columnWidth}
											updateStatus={(status) => setStatuses((current) => updateStatus(current, status))}
											openMedia={props.openMedia}
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
	)
}
const OptionPopover = forwardRef<HTMLDivElement, { timeline: Timeline; close: () => void; wrapIndex: number }>((props, ref) => {
	const { timelineRefresh } = useContext(TimelineRefreshContext)
	const { liveTag, setLiveTag } = useContext(TheDeskContext)
	const isComposeLiveTag = liveTag === props.timeline.name && props.timeline.kind === 'tag'
	const toggleLiveTagFn = () => {
		setLiveTag(isComposeLiveTag ? null : props.timeline.name)
		props.close()
	}
	const { formatMessage } = useIntl()
	const isFirst = props.wrapIndex === 0
	const removeTimelineFn = async (timeline: Timeline) => {
		await removeTimeline(timeline)
		timelineRefresh(true)
		props.close()
	}

	const switchLeftTimeline = async (timeline: Timeline) => {
		await updateColumnOrder({ id: timeline.id, direction: 'left' })
		timelineRefresh(true)
		props.close()
	}

	const switchRightTimeline = async (timeline: Timeline) => {
		await updateColumnOrder({ id: timeline.id, direction: 'right' })
		timelineRefresh(true)
		props.close()
	}
	const stackTimeline = async (timeline: Timeline) => {
		const res = await updateColumnStack({ id: timeline.id, stack: !timeline.stacked })
		if (!res) return
		timelineRefresh(true)
		props.close()
	}

	const isColumnWidthGuard = (value: string): value is ColumnWidth => columnWidthSet.includes(value as any)
	const updateColumnWidthFn = async (timeline: Timeline, columnWidth: string) => {
		if (!isColumnWidthGuard(columnWidth)) return
		await updateColumnWidth({ id: timeline.id, columnWidth: columnWidthCalc(columnWidth) })
		timelineRefresh(false)
		props.close()
	}

	const updateColumnColorFn = async (timeline: Timeline, color: string) => {
		await updateColumnColor({ id: timeline.id, color })
		timelineRefresh(false)
	}

	const updateColumnTtsFn = async (timeline: Timeline, tts: boolean) => {
		await updateColumnTts({ id: timeline.id, toggle: tts })
		timelineRefresh(true)
		props.close()
	}

	const updateColumnMediaOnlyFn = async (timeline: Timeline, mediaOnly: boolean) => {
		await updateColumnMediaOnly({ id: timeline.id, toggle: mediaOnly })
		timelineRefresh(false)
		props.close()
	}

	return (
		<Popover ref={ref} style={{ opacity: 1 }}>
			<div style={{ display: 'flex', flexDirection: 'column', width: '220px', padding: '5px' }}>
				{props.timeline.kind === 'tag' && (
					<Button onClick={toggleLiveTagFn} style={{ padding: '4px' }} startIcon={<Icon as={BsMegaphone} />}>
						<FormattedMessage id={isComposeLiveTag ? 'compose.liveTag.stop' : 'compose.liveTag.start'} />
					</Button>
				)}
				<label>
					<FormattedMessage id="timeline.settings.columnWidth" />
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
								className="colorChangeBtn"
								key={c}
								color={c}
								style={{ textTransform: 'capitalize', width: '30px', height: '30px' }}
								onClick={() => updateColumnColorFn(props.timeline, c)}
							/>
						))}
					</Stack>
				</FlexboxGrid>
				<Divider style={{ margin: '8px 0' }} />
				<label>
					<FormattedMessage id="timeline.settings.mediaOnly" />
				</label>
				<RadioGroup inline value={props.timeline?.mediaOnly?.toString() || 'false'} onChange={(value) => updateColumnMediaOnlyFn(props.timeline, value === 'true')}>
					<Radio value="false">
						<FormattedMessage id="timeline.settings.notDo" />
					</Radio>
					<Radio value="true">
						<FormattedMessage id="timeline.settings.do" />
					</Radio>
				</RadioGroup>
				<Divider style={{ margin: '8px 0' }} />
				<label>
					<FormattedMessage id="timeline.settings.tts" />
				</label>
				<RadioGroup inline value={props.timeline?.tts?.toString() || 'false'} onChange={(value) => updateColumnTtsFn(props.timeline, value === 'true')}>
					<Radio value="false">
						<FormattedMessage id="timeline.settings.notDo" />
					</Radio>
					<Radio value="true">
						<FormattedMessage id="timeline.settings.do" />
					</Radio>
				</RadioGroup>
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
						<Button
							appearance="link"
							size="xs"
							onClick={() => stackTimeline(props.timeline)}
							title={formatMessage({ id: props.timeline.stacked ? 'timeline.settings.unstack' : 'timeline.settings.stack' })}
							disabled={isFirst && !props.timeline.stacked}
						>
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

const deleteStatus = (statuses: Array<Entity.Status>, deletedId: string): Array<Entity.Status> => {
	return statuses.filter((status) => {
		if (status.reblog !== null && status.reblog.id === deletedId) {
			return false
		}
		return status.id !== deletedId
	})
}
