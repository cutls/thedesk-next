import alert from '@/components/utils/alert'
import type { Account } from '@/entities/account'
import { Instruction } from '@/entities/instruction'
import type { Marker } from '@/entities/marker'
import type { Server, ServerSet } from '@/entities/server'
import { type Timeline, colorList } from '@/entities/timeline'
import type { Unread } from '@/entities/unread'
import { TheDeskContext } from '@/context'
import FailoverImg from '@/utils/failoverImg'
import { Icon } from '@rsuite/icons'
import generator, { type Entity } from '@cutls/megalodon'
import { useRouter } from 'next/router'
import { type Dispatch, type ReactElement, type SetStateAction, useContext, useEffect, useState } from 'react'
import { BsDice1, BsDice2, BsDice3, BsDice4, BsDice5, BsDice6, BsGear, BsPencilSquare, BsPlus, BsSearch } from 'react-icons/bs'
import { FormattedMessage, useIntl } from 'react-intl'
import { Avatar, Badge, Button, Dropdown, FlexboxGrid, Popover, Sidebar, Sidenav, Stack, Text, Whisper, useToaster } from 'rsuite'
import { addTimeline, listTimelines, readSettings, removeServer, updateAccountColor } from 'utils/storage'
import { type Settings, defaultSetting } from '@/entities/settings'

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
	const { servers, openAuthorize, openAnnouncements, openThirdparty, openSettings } = props
	const [awake, setAwake] = useState(0)
	const [walkthrough, setWalkthrough] = useState(false)
	const [config, setConfig] = useState<Settings['compose']>(defaultSetting.compose)
	const toaster = useToaster()
	const { timelineRefresh } = useContext(TheDeskContext)

	// Walkthrough instruction

	useEffect(() => {
		props.servers.map(async (set) => {
			if (!set.account) return set
			const client = generator(set.server.sns, set.server.base_url, set.account.access_token, 'Fedistar')
			try {
				const notifications = (await client.getNotifications({ limit: 20 })).data
				const res = await client.getMarkers(['notifications'])
				const marker = res.data as Entity.Marker
				if (marker.notifications) {
					const count = unreadCount(marker.notifications, notifications)

					const target = props.unreads.find((u) => u.server_id === set.server.id)
					if (target) {
						props.setUnreads((unreads) =>
							unreads.map((u) => {
								if (u.server_id === set.server.id) {
									return Object.assign({}, u, { count: count })
								}
								return u
							}),
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
		const fn = async () => setConfig((await readSettings()).compose || defaultSetting.compose)
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
		const timelines = await listTimelines()
		let target = timelines.find((t) => t[1].id === set.server.id && t[0].kind === 'notifications')
		if (target === undefined || target === null) {
			await addTimeline(set.server, { kind: 'notifications', name: 'Notifications', columnWidth: 'sm' })
			const timelines = await listTimelines()
			timelineRefresh()
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
					{config.btnPosition === 'left' && <Button appearance="primary" color="green" size="lg" onClick={props.toggleCompose} startIcon={<Icon as={BsPencilSquare} />} style={{ marginLeft: '15px' }}>
						<FormattedMessage id="compose.post" />
					</Button>}
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
											left,
											top,
											onClose,
											server,
											openAuthorize,
											openAnnouncements,
											openNotification,
										},
										ref,
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
								ref,
							)
						}
					>
						<Button
							appearance="link"
							size="lg"
							style={{ paddingRight: 0 }}
						>
							<Icon as={diceCt(awake)} style={{ fontSize: '1.4em' }} />
						</Button>
					</Whisper>
					<Button appearance="link" size="lg" title={formatMessage({ id: 'navigator.settings.title' })} onClick={() => openSettings()}>
						<Icon as={BsGear} style={{ fontSize: '1.4em' }} />
					</Button>
				</div>
				{(!config.btnPosition || config.btnPosition === 'right') && <Button appearance="primary" color="green" size="lg" onClick={props.toggleCompose} startIcon={<Icon as={BsPencilSquare} />}>
					<FormattedMessage id="compose.post" />
				</Button>}
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
}

const serverMenu = ({ className, left, top, onClose, server, openAuthorize, openAnnouncements, openNotification }: ServerMenuProps, ref: React.RefCallback<HTMLElement>): ReactElement => {
	const router = useRouter()
	const { timelineRefresh } = useContext(TheDeskContext)

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
				timelineRefresh()
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
		timelineRefresh()
	}
	return (
		<Popover ref={ref} className={className} style={{ left, top, padding: 0 }}>
			<Dropdown.Menu onSelect={handleSelect}>
				{server.server.account_id === null && (
					<Dropdown.Item eventKey="authorize">
						<FormattedMessage id="navigator.servers.authorize" />
					</Dropdown.Item>
				)}
				{server.server.account_id !== null && (
					<Dropdown.Item eventKey="profile">
						<FormattedMessage id="navigator.servers.profile" />
					</Dropdown.Item>
				)}
				{server.server.account_id !== null && (
					<>
						<Dropdown.Item eventKey="notifications">
							<FormattedMessage id="navigator.servers.notifications" />
						</Dropdown.Item>
						<Dropdown.Item eventKey="announcements">
							<FormattedMessage id="navigator.servers.announcements" />
						</Dropdown.Item>
						<Dropdown.Item eventKey="lists">
							<FormattedMessage id="navigator.servers.lists" />
						</Dropdown.Item>
						<Dropdown.Item eventKey="followed_hashtags">
							<FormattedMessage id="navigator.servers.followed_hashtags" />
						</Dropdown.Item>
					</>
				)}
				<Dropdown.Item eventKey="remove" style={{ backgroundColor: 'var(--rs-color-red)' }}>
					<FormattedMessage id="navigator.servers.remove" />
				</Dropdown.Item>
			</Dropdown.Menu>
			<Text style={{ fontSize: '1rem', textAlign: 'center' }}>
				<FormattedMessage id="navigator.servers.color" />
			</Text>
			<FlexboxGrid justify="center">
				<Stack wrap spacing={6} style={{ maxWidth: '150px', padding: '5px' }}>
					<Button style={{ textTransform: 'capitalize', width: '30px', height: '30px' }} className="colorChangeBtn" onClick={() => updateAccountColorFn(server.server.account_id, 'unset')} />
					{colorList.map((c) => (
						<Button appearance="primary" className="colorChangeBtn" key={c} color={c} style={{ textTransform: 'capitalize', width: '30px', height: '30px' }} onClick={() => updateAccountColorFn(server.server.account_id, c)} />
					))}
				</Stack>
			</FlexboxGrid>
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
