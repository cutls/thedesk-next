import { USER_AGENT } from '@/defaults'
import type { Account } from '@/entities/account'
import type { Server } from '@/entities/server'
import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import { useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { Modal } from 'rsuite'
import Accounts from './Accounts'
import Status from './Status'

type Props = {
	opened: boolean
	status: Entity.Status
	close: () => void
}

export default function FromOtherAccount(props: Props) {
	const [server, setServer] = useState<Server | null>(null)
	const [account, setAccount] = useState<Account | null>(null)
	const [client, setClient] = useState<MegalodonInterface | null>(null)

	useEffect(() => {
		if (server === null || account === null) {
			return
		}
		const cli = generator(server.sns, server.base_url, account.access_token, USER_AGENT)
		setClient(cli)
	}, [server, account])

	const reset = () => {
		setServer(null)
		setAccount(null)
		setClient(null)
	}

	const body = () => {
		if (!server || !account) {
			return (
				<Accounts
					next={(server: Server, account: Account) => {
						setServer(server)
						setAccount(account)
					}}
				/>
			)
		}
		return (
			<Status
				client={client}
				account={account}
				server={server}
				target={props.status}
				next={() => {
					reset()
					props.close()
				}}
			/>
		)
	}

	if (props.status) {
		return (
			<Modal
				size="sm"
				open={props.opened}
				onClose={() => {
					reset()
					props.close()
				}}
			>
				<Modal.Header>
					<FormattedMessage id="from_other_account.title" />
				</Modal.Header>
				{body()}
			</Modal>
		)
	}
	return <></>
}
