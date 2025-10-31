import generator, { type Entity } from '@cutls/megalodon'
import { Icon } from '@rsuite/icons'
import { useRouter } from 'next/router'
import { type Dispatch, type ReactElement, type SetStateAction, useContext, useEffect, useState } from 'react'
import {
	BsBell,
	BsBoxArrowInRight,
	BsBoxArrowRight,
	BsDice1,
	BsDice2,
	BsDice3,
	BsDice4,
	BsDice5,
	BsDice6,
	BsGear,
	BsHash,
	BsList,
	BsMegaphone,
	BsPencilSquare,
	BsPerson,
	BsPlus,
	BsSearch
} from 'react-icons/bs'
import { FormattedMessage, useIntl } from 'react-intl'
import { Avatar, Badge, Button, Dropdown, FlexboxGrid, IconButton, Popover, Sidebar, Sidenav, Stack, Text, useToaster, Whisper } from 'rsuite'
import { addTimeline, getServer, listAccounts, listTimelines, readSettings, removeServer, updateAccountColor } from 'utils/storage'
import alert from '@/components/utils/alert'
import { TheDeskContext, TimelineRefreshContext } from '@/context'
import type { Account } from '@/entities/account'
import { Instruction } from '@/entities/instruction'
import type { Marker } from '@/entities/marker'
import type { Server, ServerSet } from '@/entities/server'
import { defaultSetting, type Settings } from '@/entities/settings'
import { colorList, type Timeline } from '@/entities/timeline'
import type { Unread } from '@/entities/unread'
import type { ReceiveNotificationPayload } from '@/payload'
import FailoverImg from '@/utils/failoverImg'
import Notifications from './timelines/Notifications'

type ImitateFormattedMessage = ({ id }: { id: string }) => string

type NavigatorProps = {
	servers: Array<ServerSet>
	unreads: Array<Unread>
	addNewServer: () => void
	openAuthorize: (server: Server) => void
	openAnnouncements: (server: Server, account: Account) => void
	toggleCompose: () => void
	toggleSearch: () => void
	openThirdparty: () => void
	openSettings: () => void
	setHighlighted: Dispatch<SetStateAction<Timeline>>
	setUnreads: Dispatch<SetStateAction<Array<Unread>>>
}
const diceCt = (dice: number) => {
	if (!dice || dice <= 1) return BsDice1
	if (dice <= 2) return BsDice2
	if (dice <= 3) return BsDice3
	if (dice <= 4) return BsDice4
	if (dice <= 5) return BsDice5
	return BsDice6
}
const Navigator: React.FC<NavigatorProps> = (props): ReactElement => {
	const { formatMessage } = useIntl()
	const { timelineConfig } = useContext(TheDeskContext)
	const { timelineRefresh } = useContext(TimelineRefreshContext)
	const { servers, openAuthorize, openAnnouncements, openThirdparty, openSettings } = props
	const [awake, setAwake] = useState(0)
	const [walkthrough, setWalkthrough] = useState(false)
	const [config, setConfig] = useState<Settings['compose']>(defaultSetting.compose)
	const toaster = useToaster()

	// Walkthrough instruction

	useEffect(() => {
		props.servers.map(async (set) => {
			if (!set.account) return set
			const client = generator(set.server.sns, set.server.base_url, set.account.access_token, 'Fedistar')
			const read = async (id: string) => {
				props.setUnreads((current) => {
					const updated = current.map((u) => {
						if (u.server_id === set.server.id) {
							return Object.assign({}, u, { count: 0 })
						}
						return u
					})

					return updated
				})
				// Update maker for server-side
				try {
					await client.saveMarkers({ notifications: { last_read_id: id } })
					if (set.server.sns === 'pleroma') {
						await client.readNotifications({ max_id: id })
					}
				} catch {
					console.error('failed to update marker')
				}
			}
			try {
				const notifications = (await client.getNotifications({ limit: 20 })).data
				const res = await client.getMarkers(['notifications'])
				const marker = res.data as Entity.Marker
				if (marker.notifications) {
					const count = unreadCount(marker.notifications, notifications)
					if (count > 0 && timelineConfig.notification !== 'no')
						new window.Notification(`TheDesk: ${set.account.username}@${set.server.domain}`, {
							body: formatMessage({ id: 'timeline.notification.unread' }, { count })
						}).onclick = () => read(notifications[0].id)
					const target = props.unreads.find((u) => u.server_id === set.server.id)
					if (target) {
						props.setUnreads((unreads) =>
							unreads.map((u) => {
								if (u.server_id === set.server.id) {
									return Object.assign({}, u, { count: count })
								}
								return u
							})
						)
					} else {
						props.setUnreads((unreads) => unreads.concat({ server_id: set.server.id, count: count }))
					}
				}
			} catch (err) {
				console.error(err)
			}
			return set
		})
	}, [props.servers])
	useEffect(() => {
		const fn = async () => {
			setConfig((await readSettings()).compose || defaultSetting.compose)
		}
		fn()
		setInterval(() => {
			setAwake((current) => current + 1)
		}, 600000)
	}, [])

	const closeWalkthrough = async () => {
		setWalkthrough(false)
	}

	const openNotification = async (set: ServerSet) => {
		//if (!props.unreads.find((u) => u.server_id === set.server.id && u.count > 0)) return
		const timelines = (await listTimelines()).flat()
		let target = timelines.find((t) => t[1].id === set.server.id && t[0].kind === 'notifications')
		if (target === undefined || target === null) {
			await addTimeline(set.server, { kind: 'notifications', name: 'Notifications', columnWidth: 'sm' })
			const timelines = (await listTimelines()).flat()
			timelineRefresh(false)
			target = timelines.find((t) => t[1].id === set.server.id && t[0].kind === 'notifications')
			if (target === undefined || target === null) {
				toaster.push(alert('error', formatMessage({ id: 'alert.notifications_not_found' })), { placement: 'topStart' })
			}
		}

		props.setHighlighted((current) => {
			if (current && current.id === target[0].id) {
				return current
			}
			setTimeout(() => {
				props.setHighlighted(null)
			}, 5000)
			return target[0]
		})

		return
	}

	return (
		<div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--rs-sidenav-default-bg)', height: '56px' }}>
			<div style={{ display: 'flex', alignItems: 'center' }}>
				<div style={{ display: 'flex', alignItems: 'center' }}>
					{config.btnPosition === 'left' && (
						<Button appearance="primary" color="green" size="lg" onClick={props.toggleCompose} startIcon={<Icon as={BsPencilSquare} />} style={{ marginLeft: '15px' }}>
							<FormattedMessage id="compose.post" />
						</Button>
					)}
					<Button appearance="link" size="lg" onClick={props.toggleSearch} style={{ marginRight: '15px' }}>
						<Icon as={BsSearch} style={{ fontSize: '1.4em' }} />
					</Button>
					{walkthrough && (
						<div style={{ position: 'relative' }}>
							<Popover arrow={false} visible={walkthrough} style={{ left: 12, top: 'auto', bottom: 0 }}>
								<div style={{ width: '120px' }}>
									<h4 style={{ fontSize: '1.2em' }}>
										<FormattedMessage id="walkthrough.navigator.servers.title" />
									</h4>
									<p>
										<FormattedMessage id="walkthrough.navigator.servers.description" />
									</p>
								</div>
								<FlexboxGrid justify="end">
									<Button appearance="default" size="xs" onClick={closeWalkthrough}>
										<FormattedMessage id="walkthrough.navigator.servers.ok" />
									</Button>
								</FlexboxGrid>
							</Popover>
						</div>
					)}
					{servers.map((server, i) => (
						<div key={server.server.id} style={{ marginTop: '5px' }}>
							<Whisper
								placement="top"
								controlId="control-id-context-menu"
								trigger="click"
								onOpen={closeWalkthrough}
								preventOverflow={true}
								speaker={({ className, left, top, onClose }, ref) =>
									serverMenu(
										{
											className,
											left: left,
											top: top,
											onClose,
											server,
											openAuthorize,
											openAnnouncements,
											openNotification,
											unreads: props.unreads,
											setUnreads: props.setUnreads,
											formatMessage: formatMessage as ImitateFormattedMessage
										},
										ref
									)
								}
							>
								<Button
									appearance="link"
									size="xs"
									style={{ padding: '4px', borderColor: server.account?.color || 'transparent', borderWidth: '2px', borderStyle: 'solid' }}
									title={server.account ? `${server.account.username}@${server.server.domain}` : server.server.domain}
								>
									<Badge content={!!props.unreads.find((u) => u.server_id === server.server.id && u.count > 0)}>
										<Avatar size="sm" src={server.account?.avatar || FailoverImg(server.server.favicon)} className="server-icon colorChangeBtn" alt={server.server.domain} key={server.server.id} />
									</Badge>
								</Button>
							</Whisper>
						</div>
					))}
					<Button appearance="link" size="lg" style={{ padding: 0 }} onClick={props.addNewServer} title={formatMessage({ id: 'navigator.add_server.title' })}>
						<Icon as={BsPlus} style={{ fontSize: '1.4em' }} />
					</Button>
				</div>
			</div>
			<div style={{ display: 'flex', alignItems: 'center', paddingRight: '10px' }}>
				<div style={{ display: 'flex', alignItems: 'center', border: '1px solid', borderRadius: '5px', marginRight: '10px' }}>
					<Whisper
						placement="top"
						controlId="control-id-setting-menu"
						trigger="click"
						onOpen={closeWalkthrough}
						preventOverflow={true}
						speaker={({ className, left, top, onClose }, ref) =>
							settingsMenu(
								{
									className,
									left,
									top,
									onClose,
									openThirdparty,
									openSettings
								},
								ref
							)
						}
					>
						<Button appearance="link" size="lg" style={{ paddingRight: 0 }}>
							<Icon as={diceCt(awake)} style={{ fontSize: '1.4em' }} />
						</Button>
					</Whisper>
					<Button appearance="link" size="lg" title={formatMessage({ id: 'navigator.settings.title' })} onClick={() => openSettings()}>
						<Icon as={BsGear} style={{ fontSize: '1.4em' }} />
					</Button>
				</div>
				{(!config.btnPosition || config.btnPosition === 'right') && (
					<Button appearance="primary" color="green" size="lg" onClick={props.toggleCompose} startIcon={<Icon as={BsPencilSquare} />}>
						<FormattedMessage id="compose.post" />
					</Button>
				)}
			</div>
		</div>
	)
}

type ServerMenuProps = {
	className: string
	left?: number
	top?: number
	onClose: (delay?: number) => NodeJS.Timeout | void
	server: ServerSet
	openAuthorize: (server: Server) => void
	openAnnouncements: (server: Server, account: Account) => void
	openNotification: (set: ServerSet) => Promise<void>
	unreads: Unread[]
	setUnreads: Dispatch<SetStateAction<Unread[]>>
	formatMessage: ImitateFormattedMessage
}

const serverMenu = (
	{ className, left, top, onClose, server, openAuthorize, openAnnouncements, openNotification, unreads, setUnreads, formatMessage }: ServerMenuProps,
	ref: React.RefCallback<HTMLElement>
): ReactElement => {
	const router = useRouter()
	const { timelineRefresh } = useContext(TimelineRefreshContext)

	const handleSelect = (eventKey: string) => {
		onClose()
		switch (eventKey) {
			case 'authorize':
				openAuthorize(server.server)
				break
			case 'profile':
				router.push({ query: { user_id: server.account.account_id, server_id: server.server.id, account_id: server.account.id } })
				break
			case 'remove':
				removeServer({ id: server.server.id })
				timelineRefresh(false)
				break
			case 'announcements':
				openAnnouncements(server.server, server.account)
				break
			case 'lists':
				router.push({ query: { lists: 'all', server_id: server.server.id, account_id: server.account.id } })
				break
			case 'followed_hashtags':
				router.push({ query: { followed_hashtags: 'all', server_id: server.server.id, account_id: server.account.id } })
				break
			case 'notifications':
				openNotification(server)
				break
		}
	}
	const updateAccountColorFn = (id: number, color: string) => {
		updateAccountColor({ id, color })
		timelineRefresh(false)
	}
	return (
		<Popover ref={ref} className={className} style={{ left, top, padding: 0, marginLeft: 10 }}>
			<FlexboxGrid justify="center">
				<Stack wrap spacing={6} style={{ padding: '5px' }}>
					{server.server.account_id === null && (
						<IconButton onClick={() => handleSelect('authorize')} title={formatMessage({ id: 'navigator.servers.authorize' })} icon={<Icon as={BsBoxArrowInRight} />} />
					)}
					{server.server.account_id !== null && <IconButton onClick={() => handleSelect('profile')} title={formatMessage({ id: 'navigator.servers.profile' })} icon={<Icon as={BsPerson} />} />}
					{server.server.account_id !== null && (
						<>
							<IconButton onClick={() => handleSelect('notifications')} title={formatMessage({ id: 'navigator.servers.notifications' })} icon={<Icon as={BsBell} />} />
							<IconButton onClick={() => handleSelect('announcements')} title={formatMessage({ id: 'navigator.servers.announcements' })} icon={<Icon as={BsMegaphone} />} />
							<IconButton onClick={() => handleSelect('lists')} title={formatMessage({ id: 'navigator.servers.lists' })} icon={<Icon as={BsList} />} />
							<IconButton onClick={() => handleSelect('followed_hashtags')} title={formatMessage({ id: 'navigator.servers.followed_hashtags' })} icon={<Icon as={BsHash} />} />
						</>
					)}
					<IconButton onClick={() => handleSelect('remove')} title={formatMessage({ id: 'navigator.servers.remove' })} color="red" appearance="primary" icon={<Icon as={BsBoxArrowRight} />} />
				</Stack>
			</FlexboxGrid>
			<FlexboxGrid justify="center">
				<Stack wrap spacing={6} style={{ padding: '5px' }}>
					<Button style={{ textTransform: 'capitalize', width: '20px', height: '20px' }} className="colorChangeBtn" onClick={() => updateAccountColorFn(server.server.account_id, 'unset')} />
					{colorList.map((c) => (
						<Button
							appearance="primary"
							className="colorChangeBtn"
							key={c}
							color={c}
							style={{ textTransform: 'capitalize', width: '20px', height: '20px' }}
							onClick={() => updateAccountColorFn(server.server.account_id, c)}
						/>
					))}
				</Stack>
			</FlexboxGrid>
			<div style={{ height: '50vh', padding: 5 }}>
				{server.server.account_id ? (
					<Notifications server={server.server} unreads={unreads} setUnreads={setUnreads} openMedia={() => {}} openReport={() => {}} openFromOtherAccount={() => {}} wrapIndex={-1} />
				) : (
					<FormattedMessage id="navigator.servers.requires_login" />
				)}
			</div>
		</Popover>
	)
}

type SettingsMenuProps = {
	className: string
	left?: number
	top?: number
	onClose: (delay?: number) => NodeJS.Timeout | void
	openThirdparty: () => void
	openSettings: () => void
}

const settingsMenu = ({ className, left, top, onClose, openThirdparty, openSettings }: SettingsMenuProps, ref: React.RefCallback<HTMLElement>): ReactElement => {
	const handleSelect = async (eventKey: string) => {
		onClose()
		switch (eventKey) {
			case 'settings': {
				openSettings()
				break
			}
			case 'thirdparty': {
				openThirdparty()
				break
			}
		}
	}

	return (
		<Popover ref={ref} className={className} style={{ left, top, padding: 0 }}>
			<Dropdown.Menu onSelect={handleSelect}>
				<Dropdown.Item eventKey="settings">
					<FormattedMessage id="navigator.settings.settings" />
				</Dropdown.Item>
				<Dropdown.Item eventKey="thirdparty">
					<FormattedMessage id="navigator.settings.thirdparty" />
				</Dropdown.Item>
			</Dropdown.Menu>
		</Popover>
	)
}

const unreadCount = (marker: Marker, notifications: Array<Entity.Notification>): number => {
	if (marker.unread_count !== undefined) {
		return marker.unread_count
	}
	return notifications.filter((n) => Number.parseInt(n.id) > Number.parseInt(marker.last_read_id)).length
}

export default Navigator
