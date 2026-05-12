import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import { Icon } from '@rsuite/icons'
import { useCallback, useEffect, useState } from 'react'
import { BsChatQuote, BsFire, BsHash, BsPeople, BsX } from 'react-icons/bs'
import { FormattedMessage } from 'react-intl'
import { Avatar, Button, Container, Content, Dropdown, FlexboxGrid, Header, List, Loader, Panel } from 'rsuite'
import { USER_AGENT } from '@/defaults'
import type { Account } from '@/entities/account'
import type { Server, ServerSet } from '@/entities/server'
import { listAccounts, setUsualAccount } from '@/utils/storage'
import { renderAccountIcon } from '../compose/Compose'
import Results from './Results'
import emojify from '@/utils/emojify'
import Time from '../utils/Time'
import { useRouter } from 'next/router'
import { User } from './Results'
import { GraphDraw } from '../utils/Graph'
import { stripTagAndLink } from '@/utils/statusParser'

type Props = {
	setOpened: (value: boolean) => void
	servers: Array<ServerSet>
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	openReport: (status: Entity.Status, client: MegalodonInterface) => void
	openFromOtherAccount: (status: Entity.Status) => void
}
export default function Search(props: Props) {
	const [accounts, setAccounts] = useState<Array<[Account, Server]>>([])
	const [fromAccount, setFromAccount] = useState<[Account, Server]>()
	const [client, setClient] = useState<MegalodonInterface>()
	const [isShowTrend, setIsShowTrend] = useState<boolean>(true)
	const [isLoading, setIsLoading] = useState<boolean>(true)
	const [trendTags, setTrendTags] = useState<Array<Entity.Tag>>([])
	const [trendUsers, setTrendUsers] = useState<Array<Entity.Account>>([])
	const [trendPosts, setTrendPosts] = useState<Array<Entity.Status>>([])
	const router = useRouter()

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

	useEffect(() => {
		const f = async () => {
			const accounts = await listAccounts()
			setAccounts(accounts)

			const usual = accounts.find(([a, _]) => a.usual)
			if (usual) {
				setFromAccount(usual)
			} else {
				setFromAccount(accounts[0])
			}
		}
		f()
	}, [props.servers])

	useEffect(() => {
		if (!fromAccount || fromAccount.length < 2) {
			return
		}
		const client = generator(fromAccount[1].sns, fromAccount[1].base_url, fromAccount[0].access_token, USER_AGENT)
		setClient(client)
		const fn = async () => {
			setIsLoading(true)
			setIsShowTrend(true)
			try {
				const res1 = await client.getInstanceTrends(10)
				setTrendTags(res1.data)
			} catch (e) {
				setTrendTags([])
			}
			try {
				const res2 = await client.getInstanceTrendUsers(10)
				setTrendUsers(res2.data)
			} catch (e) {
				setTrendUsers([])
			}
			try {
				const res3 = await client.getInstanceTrendPosts(10)
				setTrendPosts(res3.data)
			} catch (e) {
				setTrendPosts([])
			}
			setIsLoading(false)
		}
		fn()
	}, [fromAccount])

	const selectAccount = async (eventKey: string) => {
		const account = accounts[Number.parseInt(eventKey, 10)]
		setFromAccount(account)
		await setUsualAccount({ id: account[0].id })
	}
	const hideTrend = () => setIsShowTrend(false)

	const handleKeyPress = useCallback(
			(event: KeyboardEvent) => {
				const globalFocused = Array.from(document.activeElement.classList).includes('rs-input')
				if (!globalFocused && event.key === 's') {
					props.setOpened(true)
					const f = async () => {
						await new Promise((resolve) => setTimeout(resolve, 500))
						const input = document.querySelector<HTMLInputElement>('#search-input')
						input?.focus()
					}
					f()
				}
				if (event.key === 'Escape') props.setOpened(false)
			},
			[]
		)
	
		useEffect(() => {
			document.addEventListener('keydown', handleKeyPress)
	
			return () => {
				document.removeEventListener('keydown', handleKeyPress)
			}
		}, [handleKeyPress])

	return (
		<Container style={{ backgroundColor: 'var(--background-overlay)', height: '100%' }}>
			<Header style={{ borderBottom: '1px solid var(--rs-divider-border)', backgroundColor: 'var(--rs-state-hover-bg)' }}>
				<FlexboxGrid justify="space-between" align="middle">
					<FlexboxGrid.Item style={{ lineHeight: '53px', paddingLeft: '12px', fontSize: '18px' }}>
						<FormattedMessage id="search.title" />
					</FlexboxGrid.Item>
					<FlexboxGrid.Item className="hideen-in-animating">
						<Button appearance="link" onClick={() => props.setOpened(false)}>
							<Icon as={BsX} style={{ fontSize: '1.4em' }} />
						</Button>
					</FlexboxGrid.Item>
				</FlexboxGrid>
			</Header>
			<Content style={{ height: '100%', padding: '12px', backgroundColor: 'var(--background-overlay)' }} className="sidepanel-scrollable">
				<FlexboxGrid>
					<FlexboxGrid.Item>
						<Dropdown renderToggle={(props, ref) => renderAccountIcon(props, ref, fromAccount)} onSelect={selectAccount}>
							{accounts.map((account, index) => (
								<Dropdown.Item eventKey={index} key={`@${account[0].username}@${account[1]?.domain || ''}`}>
									@{account[0].username}@{account[1]?.domain || ''}
								</Dropdown.Item>
							))}
						</Dropdown>
					</FlexboxGrid.Item>
				</FlexboxGrid>
				{fromAccount && (
					<Results
						hideTrend={hideTrend}
						client={client}
						server={fromAccount[1]}
						account={fromAccount[0]}
						openMedia={props.openMedia}
						openReport={props.openReport}
						openFromOtherAccount={props.openFromOtherAccount}
						setStatusDetail={setStatusDetail}
						setAccountDetail={setAccountDetail}
						setTagDetail={setTagDetail}
					/>
				)}
				{isShowTrend && isLoading ? (
					<div style={{ display: 'flex', width: '100%', justifyContent: 'center', marginTop: 30 }}>
						<Loader />
					</div>
				) : (
					<>
						<div style={{ display: 'flex', alignItems: 'center', margin: '0.4em 0' }}>
							<Icon as={BsFire} style={{ fontSize: '1.4em', marginRight: '0.2em' }} />
							<p style={{ fontSize: '1.4em' }}>
								<FormattedMessage id="search.trend" />
							</p>
						</div>

						<div style={{ display: 'flex', alignItems: 'center', margin: '0.4em 0' }}>
							<Icon as={BsHash} style={{ fontSize: '1.2em', marginRight: '0.2em' }} />
							<p style={{ fontSize: '1.2em' }}>
								<FormattedMessage id="search.results.hashtags" />
							</p>
						</div>

						<List>
							{trendTags.map((tag) => (
								<List.Item
									key={tag.name}
									style={{ backgroundColor: 'var(--rs-border-primary)', padding: '4px', paddingRight: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
									title={`#${tag.name}`}
								>
									<div style={{ padding: '12px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => setTagDetail(tag.name, fromAccount[1].id, fromAccount[0].id)}>
										#{tag.name}
									</div>
									<GraphDraw his={tag.history} />
								</List.Item>
							))}
						</List>
						{!trendTags.length && <FormattedMessage id="search.noData" />}

						<div style={{ display: 'flex', alignItems: 'center', margin: '0.4em 0' }}>
							<Icon as={BsPeople} style={{ fontSize: '1.2em', marginRight: '0.2em' }} />
							<p style={{ fontSize: '1.2em' }}>
								<FormattedMessage id="search.results.accounts" />
							</p>
						</div>
						<List>
							{trendUsers.map((account) => (
								<List.Item key={account.id} style={{ backgroundColor: 'var(--rs-border-primary)', padding: '4px 0' }}>
									<User user={account} open={(user: Entity.Account) => setAccountDetail(user.id, fromAccount[1].id, fromAccount[0].id)} />
								</List.Item>
							))}
						</List>
						{!trendUsers.length && <FormattedMessage id="search.noData" />}

						<div style={{ display: 'flex', alignItems: 'center', margin: '0.4em 0' }}>
							<Icon as={BsChatQuote} style={{ fontSize: '1.2em', marginRight: '0.2em' }} />
							<p style={{ fontSize: '1.2em' }}>
								<FormattedMessage id="search.results.statuses" />
							</p>
						</div>
						{trendPosts.map((status) => (
							<Panel
								key={status.id}
								bordered
								bodyFill
								onClick={() => setStatusDetail(status.id, fromAccount[1].id, fromAccount[0].id)}
								style={{ cursor: 'pointer', marginTop: '0.2em', padding: 5 }}
								className="link-preview-panel"
							>
								<div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5em', justifyContent: 'flex-start' }}>
									<div style={{ width: '10%' }}>
										<Avatar src={status.account.avatar_static} title={status.account.acct} alt={status.account.acct} size="xs" />
									</div>
									<div style={{ width: '70%', display: 'flex', alignItems: 'center' }}>
										<p
											dangerouslySetInnerHTML={{ __html: emojify(status.account.display_name, status.account.emojis) }}
											style={{ marginLeft: 2, overflow: 'hidden', width: '70%', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
										/>
										<p style={{ color: 'var(--rs-text-tertiary)', marginLeft: 2, marginTop: 0, width: '30%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
											@{status.account.acct}
										</p>
									</div>
									<div style={{ width: '20%', display: 'flex', justifyContent: 'flex-end' }}>
										<Time style={{ color: 'var(--rs-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} time={status.created_at} />
									</div>
								</div>
								<p dangerouslySetInnerHTML={{ __html: emojify(stripTagAndLink(status.content), status.emojis) }} />
							</Panel>
						))}
						{!trendPosts.length && <FormattedMessage id="search.noData" />}
					</>
				)}
			</Content>
		</Container>
	)
}
