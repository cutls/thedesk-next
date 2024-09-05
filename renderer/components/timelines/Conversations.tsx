import generator, { type MegalodonInterface, type Entity } from '@cutls/megalodon'
import { Icon } from '@rsuite/icons'
import parse from 'parse-link-header'
import { forwardRef, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { BsChevronLeft, BsChevronRight, BsEnvelope, BsSliders, BsSquare, BsViewStacked, BsX } from 'react-icons/bs'
import { Avatar, Button, Container, Content, Divider, Dropdown, FlexboxGrid, Header, List, Loader, Popover, Radio, RadioGroup, Stack, Whisper, useToaster } from 'rsuite'

import { TheDeskContext } from '@/context'
import { TIMELINE_MAX_STATUSES, TIMELINE_STATUSES_COUNT } from '@/defaults'
import type { Account } from '@/entities/account'
import type { Server } from '@/entities/server'
import { type ColumnWidth, type Timeline, colorList, columnWidth as columnWidthCalc, columnWidthSet } from '@/entities/timeline'
import type { ReceiveTimelineConversationPayload } from '@/payload'
import FailoverImg from '@/utils/failoverImg'
import timelineName from '@/utils/timelineName'
import { useRouter } from 'next/router'
import { FormattedMessage, useIntl } from 'react-intl'
import { ResizableBox } from 'react-resizable'
import { Virtuoso } from 'react-virtuoso'
import { getAccount, removeTimeline, updateColumnColor, updateColumnOrder, updateColumnStack, updateColumnWidth } from 'utils/storage'
import alert from '../utils/alert'
import Conversation from './conversation/Conversation'

type Props = {
	server: Server
	timeline: Timeline
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	wrapIndex: number
}

const Conversations: React.FC<Props> = (props) => {
	const { formatMessage } = useIntl()
	const { listen } = useContext(TheDeskContext)
	const [account, setAccount] = useState<Account | null>(null)
	const [client, setClient] = useState<MegalodonInterface>()
	const [conversations, setConversations] = useState<Array<Entity.Conversation>>([])
	const [unreadConversations, setUnreadConversations] = useState<Array<Entity.Conversation>>([])
	const [firstItemIndex, setFirstItemIndex] = useState(TIMELINE_MAX_STATUSES)
	const [loading, setLoading] = useState(false)
	const [nextMaxId, setNextMaxId] = useState<string | null>(null)
	const [columnWidth, setColumnWidth] = useState(columnWidthCalc(props.timeline.column_width))

	const scrollerRef = useRef<HTMLElement | null>(null)
	const triggerRef = useRef(null)
	const toast = useToaster()
	const router = useRouter()

	useEffect(() => {
		const f = async () => {
			if (props.server.account_id) {
				setLoading(true)
				try {
					const [account, _] = await getAccount({ id: props.server.account_id })
					setAccount(account)
					const client = generator(props.server.sns, props.server.base_url, account.access_token, 'Fedistar')
					setClient(client)

					const res = await loadConversations(client)
					setConversations(res)
				} catch (err) {
					console.error(err)
					toast.push(alert('error', formatMessage({ id: 'alert.failed_load' }, { timeline: 'conversations' })), { placement: 'topStart' })
				} finally {
					setLoading(false)
				}
			}
		}
		f()
		setColumnWidth(columnWidthCalc(props.timeline.column_width))

		listen<ReceiveTimelineConversationPayload>('receive-timeline-conversation', (ev) => {
			if (ev.payload.timeline_id !== props.timeline.id) {
				return
			}

			if (scrollerRef.current && scrollerRef.current.scrollTop > 10) {
				// When scrolling, prepend and update unreads, and update conversations
				setUnreadConversations((current) => prependConversation(current, ev.payload.conversation))
				setConversations((current) => updateConversation(current, ev.payload.conversation))
			} else {
				// When top, prepend and update conversations
				setConversations((current) => prependConversation(current, ev.payload.conversation))
			}
		})
	}, [props.timeline])

	const loadConversations = async (client: MegalodonInterface, maxId?: string): Promise<Array<Entity.Conversation>> => {
		let options = { limit: TIMELINE_STATUSES_COUNT }
		if (maxId) {
			options = Object.assign({}, options, { max_id: maxId })
		}
		const res = await client.getConversationTimeline(options)
		const link = parse(res.headers.link)
		if (link !== null && link.next) {
			setNextMaxId(link.next.max_id)
		}
		return res.data
	}

	const selectStatus = (conversationId: string, status: Entity.Status | null) => {
		if (status) {
			if (account) {
				router.push({ query: { status_id: status.id, server_id: props.server.id, account_id: account.id } })
			} else {
				router.push({ query: { status_id: status.id, server_id: props.server.id } })
			}
			client.readConversation(conversationId)
		}
	}

	const closeOptionPopover = () => triggerRef?.current.close()

	const loadMore = useCallback(async () => {
		console.debug('appending')
		if (nextMaxId) {
			const append = await loadConversations(client, nextMaxId)
			setConversations((last) => [...last, ...append])
		}
	}, [client, conversations, setConversations, nextMaxId])

	const prependUnreads = useCallback(() => {
		console.debug('prepending')
		const unreads = unreadConversations.slice().reverse().slice(0, TIMELINE_STATUSES_COUNT).reverse()
		const remains = unreadConversations.slice(0, -1 * TIMELINE_STATUSES_COUNT)
		setUnreadConversations(() => remains)
		setFirstItemIndex(() => firstItemIndex - unreads.length)
		setConversations(() => [...unreads, ...conversations])
		return false
	}, [firstItemIndex, conversations, setConversations, unreadConversations])

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

	return (
		<ResizableBox
			width={columnWidth}
			height={0}
			axis="x"
			style={{ margin: '0 4px', minHeight: '100%', flexShrink: 0, width: columnWidth }}
			resizeHandles={['e']}
			onResizeStop={(_, e) => columnWidthSet(e.size.width)}
		>
			<Container style={{ height: 'calc(100% - 8px)' }}>
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
									<Icon as={BsEnvelope} />
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
						<FlexboxGrid.Item style={{ width: '80px' }}>
							<FlexboxGrid align="middle" justify="end">
								<FlexboxGrid.Item>
									<Whisper trigger="click" placement="bottomEnd" controlId="option-popover" ref={triggerRef} speaker={<OptionPopover timeline={props.timeline} close={closeOptionPopover} wrapIndex={props.wrapIndex} />}>
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
					<Loader style={{ margin: '10em auto ' }} />
				) : (
					<Content style={{ height: 'calc(100% - 54px)' }}>
						<List hover style={{ width: '100%', height: '100%' }}>
							<Virtuoso
								style={{ height: '100%' }}
								data={conversations}
								scrollerRef={(ref) => {
									scrollerRef.current = ref as HTMLElement
								}}
								className="timeline-scrollable"
								firstItemIndex={firstItemIndex}
								atTopStateChange={prependUnreads}
								endReached={loadMore}
								overscan={TIMELINE_STATUSES_COUNT}
								itemContent={(_, conversation) => (
									<List.Item key={conversation.id} style={{ paddingTop: '2px', paddingBottom: '2px', backgroundColor: 'var(--rs-bg-well)' }}>
										<Conversation conversation={conversation} openMedia={props.openMedia} selectStatus={selectStatus} />
									</List.Item>
								)}
							/>
						</List>
					</Content>
				)}
			</Container>
		</ResizableBox>
	)
}
const OptionPopover = forwardRef<HTMLDivElement, { timeline: Timeline; close: () => void; wrapIndex: number }>((props, ref) => {
	const { timelineRefresh } = useContext(TheDeskContext)
	const { formatMessage } = useIntl()
	const isFirst = props.wrapIndex === 0
	const newRef = useRef()
	const removeTimelineFn = async (timeline: Timeline) => {
		await removeTimeline({ id: timeline.id })
		timelineRefresh()
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
						<Button appearance="link" size="xs" onClick={() => stackTimeline(props.timeline)} title={formatMessage({ id: props.timeline.stacked ? 'timeline.settings.unstack' : 'timeline.settings.stack'})} disabled={isFirst}>
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

const prependConversation = (conversations: Array<Entity.Conversation>, conversation: Entity.Conversation): Array<Entity.Conversation> => {
	if (conversations.find((c) => c.id === conversation.id)) {
		return updateConversation(conversations, conversation)
	}
	return [conversation, ...conversations]
}

const updateConversation = (conversations: Array<Entity.Conversation>, conversation: Entity.Conversation): Array<Entity.Conversation> => {
	return conversations.map((c) => {
		if (c.id === conversation.id) {
			return conversation
		}
		return c
	})
}

export default Conversations
