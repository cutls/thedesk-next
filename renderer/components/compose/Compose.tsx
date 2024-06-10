import { Icon } from '@rsuite/icons'
import generator, { type MegalodonInterface } from '@cutls/megalodon'
import { useEffect, useState } from 'react'
import { BsX } from 'react-icons/bs'
import { Avatar, Button, Container, Content, Dropdown, FlexboxGrid, Header } from 'rsuite'

import { USER_AGENT } from '@/defaults'
import type { Account } from '@/entities/account'
import type { Server, ServerSet } from '@/entities/server'
import failoverImg from '@/utils/failoverImg'
import { listAccounts, setUsualAccount } from '@/utils/storage'
import { FormattedMessage } from 'react-intl'
import Status from './Status'

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
}

const Compose: React.FC<Props> = (props) => {
	const [accounts, setAccounts] = useState<Array<[Account, Server]>>([])
	const [fromAccount, setFromAccount] = useState<[Account, Server]>()
	const [defaultVisibility, setDefaultVisibility] = useState<'public' | 'unlisted' | 'private' | 'direct'>('public')
	const [defaultNSFW, setDefaultNSFW] = useState(false)
	const [defaultLanguage, setDefaultLanguage] = useState<string | null>(null)
	const [client, setClient] = useState<MegalodonInterface>()

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
		const f = async () => {
			const res = await client.verifyAccountCredentials()
			if (res.data.source) {
				setDefaultVisibility(res.data.source.privacy as 'public' | 'unlisted' | 'private' | 'direct')
				setDefaultNSFW(res.data.source.sensitive)
				setDefaultLanguage(res.data.source.language)
			}
		}
		f()
	}, [fromAccount])

	const selectAccount = async (eventKey: string) => {
		const account = accounts[Number.parseInt(eventKey)]
		setFromAccount(account)
		await setUsualAccount({ id: account[0].id })
	}

	return (
		<Container style={{ backgroundColor: 'var(--rs-border-secondary)', overflowY: 'auto' }}>
			<Header style={{ borderBottom: '1px solid var(--rs-divider-border)', backgroundColor: 'var(--rs-state-hover-bg)', cursor: 'move' }} className="draggable">
				<FlexboxGrid justify="space-between" align="middle">
					<FlexboxGrid.Item style={{ paddingLeft: '12px' }}>
						<FormattedMessage id="compose.title" />
					</FlexboxGrid.Item>
					<FlexboxGrid.Item>
						<Button appearance="link" onClick={() => props.setOpened(false)}>
							<Icon as={BsX} style={{ fontSize: '1.4em' }} />
						</Button>
					</FlexboxGrid.Item>
				</FlexboxGrid>
			</Header>
			<Content style={{ height: '100%', margin: '12px', backgroundColor: 'var(--rs-border-secondary)' }}>
				<FlexboxGrid style={{ marginBottom: '12px' }}>
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
					<Status
						client={client}
						server={fromAccount[1]}
						account={fromAccount[0]}
						defaultVisibility={defaultVisibility}
						defaultNSFW={defaultNSFW}
						defaultLanguage={defaultLanguage}
						setOpened={props.setOpened}
						onClose={() => props.setOpened(false)}
					/>
				)}
			</Content>
		</Container>
	)
}

export default Compose
