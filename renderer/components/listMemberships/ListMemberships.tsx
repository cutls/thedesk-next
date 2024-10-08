import { TheDeskContext } from '@/context'
import emojify from '@/utils/emojify'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import { Icon } from '@rsuite/icons'
import { useContext, useEffect, useState } from 'react'
import { BsCheck2, BsX } from 'react-icons/bs'
import { FormattedMessage } from 'react-intl'
import { Avatar, Button, FlexboxGrid, Input, InputPicker, List, Modal } from 'rsuite'

type Props = {
	opened: boolean
	list: Entity.List
	client: MegalodonInterface
	close: () => void
}

export default function ListMemberships(props: Props) {
	const [accounts, setAccounts] = useState<Array<Entity.Account>>([])
	const [title, setTitle] = useState('')
	const [users, setUsers] = useState<Array<Entity.Account>>([])
	const { timelineConfig } = useContext(TheDeskContext)
	const isAnimeIcon = timelineConfig.animation === 'yes'
	const { setFocused } = useContext(TheDeskContext)
	const focusAttr = {
		onFocus: () => setFocused(true),
		onBlur: () => setFocused(false),
	}

	useEffect(() => {
		if (props.list && props.client) {
			setTitle(props.list.title)
			const f = async () => {
				await reload(props.list.id)
			}
			f()
		}
	}, [props.list, props.client])

	const reload = async (listID: string) => {
		const res = await props.client.getAccountsInList(listID)
		setAccounts(res.data)
	}

	const remove = async (account: Entity.Account) => {
		await props.client.deleteAccountsFromList(props.list.id, [account.id])
		await reload(props.list.id)
	}

	const updateListTitle = async () => {
		await props.client.updateList(props.list.id, title)
	}

	const onSearch = async (keyword: string) => {
		const res = await props.client.searchAccount(keyword, { following: true, resolve: true, limit: 5 })
		setUsers(res.data)
	}

	const onSelect = async (value: string) => {
		await props.client.addAccountsToList(props.list.id, [value])
		setUsers([])
		await reload(props.list.id)
	}

	return (
		<Modal
			size="xs"
			open={props.opened}
			onClose={() => {
				props.close()
			}}
		>
			<Modal.Header>
				<div style={{ display: 'flex', paddingBottom: '0.7em' }}>
					<Input value={title} onChange={(value) => setTitle(value)} {...setFocused} />
					<Button appearance="link" onClick={() => updateListTitle()}>
						<Icon as={BsCheck2} />
					</Button>
				</div>
				<InputPicker
					{...focusAttr}
					placeholder={<FormattedMessage id="list_memberships.search_placeholder" />}
					data={users}
					labelKey="acct"
					valueKey="id"
					style={{ width: '100%' }}
					onSearch={onSearch}
					onSelect={onSelect}
				/>
			</Modal.Header>
			<Modal.Body>
				<div>
					<List>
						{accounts.map((account, index) => (
							<List.Item key={account.id} style={{ padding: 0 }}>
								<FlexboxGrid align="middle">
									{/** icon **/}
									<FlexboxGrid.Item colspan={4}>
										<div style={{ margin: '6px' }}>
											<Avatar src={isAnimeIcon ? account.avatar : account.avatar_static} />
										</div>
									</FlexboxGrid.Item>
									{/** name **/}
									<FlexboxGrid.Item colspan={17}>
										<div>
											<span dangerouslySetInnerHTML={{ __html: emojify(account.display_name, account.emojis) }} />
										</div>
										<div>
											<span style={{ color: 'var(--rs-text-tertiary)' }}>@{account.acct}</span>
										</div>
									</FlexboxGrid.Item>
									<FlexboxGrid.Item colspan={3}>
										<Button appearance="link" size="sm" onClick={() => remove(account)}>
											<Icon as={BsX} style={{ fontSize: '1.4em', color: 'var(--rs-text-tertiary)' }} />
										</Button>
									</FlexboxGrid.Item>
								</FlexboxGrid>
							</List.Item>
						))}
					</List>
				</div>
			</Modal.Body>
		</Modal>
	)
}
