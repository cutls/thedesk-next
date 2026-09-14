import generator, { type MegalodonInterface } from '@cutls/megalodon'
import { Icon } from '@rsuite/icons'
import { useContext, useEffect, useState } from 'react'
import { BsMegaphone, BsPencil, BsQuote, BsReply, BsX } from 'react-icons/bs'
import { FormattedMessage } from 'react-intl'
import { Avatar, Button, Container, Content, Dropdown, FlexboxGrid, Header, Text } from 'rsuite'
import { USER_AGENT } from '@/defaults'
import type { Account } from '@/entities/account'
import type { Server, ServerSet } from '@/entities/server'
import failoverImg from '@/utils/failoverImg'
import { getUsualAccount, listAccounts, setUsualAccount } from '@/utils/storage'
import Status from './Status'
import { TheDeskContext } from '@/context'
import { stripTags } from '@/utils/statusParser'

export const renderAccountIcon = (props: any, ref: any, account: [Account, Server] | undefined) => {
	if (account && account.length > 0) {
		return (
			<FlexboxGrid {...props} ref={ref} align="middle">
				<FlexboxGrid.Item style={{ marginLeft: '12px' }}>
					<Avatar src={failoverImg(account[0].avatar)} size="sm" circle />
				</FlexboxGrid.Item>
				<FlexboxGrid.Item style={{ paddingLeft: '12px' }}>
					@{account[0].username}@{account[1].domain}
				</FlexboxGrid.Item>
			</FlexboxGrid>
		)
	}
	return (
		<FlexboxGrid {...props} ref={ref} align="middle">
			<FlexboxGrid.Item>
				<Avatar src={failoverImg('')} />
			</FlexboxGrid.Item>
			<FlexboxGrid.Item>undefined</FlexboxGrid.Item>
		</FlexboxGrid>
	)
}

type Props = {
	setOpened: (value: boolean) => void
	servers: Array<ServerSet>
	disableDrag: boolean
}

const Compose: React.FC<Props> = (props) => {
	const { reply, setReply, liveTag, setLiveTag } = useContext(TheDeskContext)
	const [accounts, setAccounts] = useState<Array<[Account, Server]>>([])
	const [fromAccount, setFromAccount] = useState<[Account, Server]>()
	const [defaultVisibility, setDefaultVisibility] = useState<'public' | 'unlisted' | 'private' | 'direct'>('public')
	const [defaultNSFW, setDefaultNSFW] = useState(false)
	const [defaultLanguage, setDefaultLanguage] = useState<string | null>(null)
	const [defaultQuotePolicy, setDefaultQuotePolicy] = useState<'public' | 'followers' | 'nobody'>('public')
	const [client, setClient] = useState<MegalodonInterface>()

	useEffect(() => {
		const f = async () => {
			const accounts = await listAccounts()
			setAccounts(accounts)

			const usualNum = await getUsualAccount()
			const account = accounts.find(([a, _]) => a.id === usualNum)
			if (account) {
				setFromAccount(account)
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
		const f = async () => {
			const res = await client.verifyAccountCredentials()
			if (res.data.source) {
				setDefaultVisibility(res.data.source.privacy as 'public' | 'unlisted' | 'private' | 'direct')
				setDefaultNSFW(res.data.source.sensitive)
				setDefaultLanguage(res.data.source.language)
				setDefaultQuotePolicy(res.data.source.quote_policy as 'public' | 'followers' | 'nobody')
			}
		}
		f()
	}, [fromAccount])

	useEffect(() => setFromAccount(accounts.find((a) => a[0].account_id === reply?.inReplyToAccountId) || fromAccount), [reply])

	const selectAccount = async (eventKey: string) => {
		const account = accounts[Number.parseInt(eventKey, 10)]
		setFromAccount(account)
		await setUsualAccount({ id: account[0].id })
	}

	const onClose = () => {
		setReply(null)
		props.setOpened(false)
	}
	const addStyle = props.disableDrag ? {} : { borderColor: 'var(--rs-border-primary)', borderWidth: '1px', borderStyle: 'solid', borderRadius: '8px' }

	return (
		<Container style={{ backgroundColor: 'var(--background-overlay)', overflowY: 'auto', width: '320px', ...addStyle }}>
			<Header style={{ borderBottom: '1px solid var(--rs-divider-border)', backgroundColor: 'var(--rs-state-hover-bg)', cursor: 'move' }} className="draggable">
				<FlexboxGrid justify="space-between" align="middle">
					<FlexboxGrid.Item style={{ paddingLeft: '12px' }}>
						{!reply ? (
							<FormattedMessage id="compose.title" />
						) : reply.type === 'quote' ? (
							<FormattedMessage id="timeline.notification.quote.title" />
						) : reply.type === 'reply' ? (
							<FormattedMessage id="timeline.actions.reply" />
						) : reply.type === 'edit' ? (
							<FormattedMessage id="timeline.actions.detail.edit" />
						) : null}
					</FlexboxGrid.Item>
					<FlexboxGrid.Item>
						<Button appearance="link" onClick={() => onClose()}>
							<Icon as={BsX} style={{ fontSize: '1.4em' }} />
						</Button>
					</FlexboxGrid.Item>
				</FlexboxGrid>
			</Header>
			<Content style={{ height: '100%', margin: '12px', backgroundColor: 'var(--background-overlay)' }}>
				<FlexboxGrid style={{ marginBottom: '12px' }}>
					<FlexboxGrid.Item>
						<Dropdown disabled={!!reply} renderToggle={(props, ref) => renderAccountIcon(props, ref, fromAccount)} onSelect={selectAccount}>
							{accounts.map((account, index) => (
								<Dropdown.Item eventKey={index} key={`@${account[0].username}@${account[1]?.domain || ''}`}>
									@{account[0].username}@{account[1]?.domain || ''}
								</Dropdown.Item>
							))}
						</Dropdown>
					</FlexboxGrid.Item>
				</FlexboxGrid>
				{reply ? (
					reply.type !== 'edit' ? (
						<Content style={{ marginTop: 10, marginBottom: 10, backgroundColor: reply.type === 'quote' ? 'var(--rs-cyan-900)' : 'var(--rs-blue-900)', padding: 5, borderRadius: 5, display: 'flex' }}>
							<div style={{ width: 20 }}>{reply.type === 'quote' ? <BsQuote style={{ fontSize: '0.8em', marginLeft: 3 }} /> : <BsReply style={{ fontSize: '0.8em', marginLeft: 3 }} />}</div>
							<Text style={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripTags(reply.replyStatus.content)}</Text>
							<div style={{ width: 20 }}>
								<Button appearance="link" onClick={() => setReply(null)} style={{ padding: 0 }}>
									<Icon as={BsX} style={{ fontSize: '1.2em' }} />
								</Button>
							</div>
						</Content>
					) : (
						<Content style={{ marginTop: 10, marginBottom: 10, backgroundColor: 'var(--rs-yellow-800)', padding: 5, borderRadius: 5, display: 'flex' }}>
							<div style={{ width: 20 }}>
								<BsPencil style={{ fontSize: '0.8em', marginLeft: 3 }} />
							</div>
							<Text style={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
								<FormattedMessage id="compose.editMyPost" />
							</Text>
							<div style={{ width: 20 }}>
								<Button appearance="link" onClick={() => setReply(null)} style={{ padding: 0 }}>
									<Icon as={BsX} style={{ fontSize: '1.2em' }} />
								</Button>
							</div>
						</Content>
					)
				) : null}
				{liveTag ? (
					<Content style={{ marginTop: 10, marginBottom: 10, backgroundColor: 'var(--rs-cyan-900)', padding: 5, borderRadius: 5, display: 'flex' }}>
						<div style={{ width: 20 }}>
							<BsMegaphone style={{ fontSize: '0.8em', marginLeft: 3 }} />
						</div>
						<div style={{ flexGrow: 1 }}>
							<Text style={{ height: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
								<FormattedMessage id="compose.liveTag.title" values={{ tag: liveTag }} />
							</Text>
							<Text style={{ height: 'auto', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
								<FormattedMessage id="compose.liveTag.hint" />
							</Text>
						</div>
						<div style={{ width: 20 }}>
							<Button appearance="link" onClick={() => setLiveTag(null)} style={{ padding: 0 }}>
								<Icon as={BsX} style={{ fontSize: '1.2em' }} />
							</Button>
						</div>
					</Content>
				) : null}
				{fromAccount && (
					<Status
						client={client}
						server={fromAccount[1]}
						account={fromAccount[0]}
						defaultVisibility={defaultVisibility}
						defaultNSFW={defaultNSFW}
						defaultLanguage={defaultLanguage}
						defaultQuotePolicy={defaultQuotePolicy}
						setOpened={props.setOpened}
						onClose={() => onClose()}
						inReplyTo={reply?.type === 'reply' ? reply.replyStatus : undefined}
						editTarget={reply?.type === 'edit' ? reply.replyStatus : undefined}
						quoteTarget={reply?.type === 'quote' ? reply.replyStatus : undefined}
					/>
				)}
			</Content>
		</Container>
	)
}

export default Compose
