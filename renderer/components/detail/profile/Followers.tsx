import { TIMELINE_STATUSES_COUNT } from '@/defaults'
import type { Account } from '@/entities/account'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import parse from 'parse-link-header'
import { useEffect, useImperativeHandle, useState } from 'react'
import { List, Loader } from 'rsuite'
import User from './User'

export type FuncProps = {
	loadMore: () => Promise<void>
}

type ArgProps = {
	client: MegalodonInterface
	user: Entity.Account
	account: Account | null
}

const Followers: React.ForwardRefRenderFunction<FuncProps, ArgProps> = (props, ref) => {
	const { client, user, account } = props
	const [followers, setFollowers] = useState<Array<Entity.Account>>([])
	const [relationships, setRelationships] = useState<Array<Entity.Relationship>>([])
	const [loading, setLoading] = useState(false)
	const [loadingMore, setLoadingMore] = useState<boolean>(false)
	const [nextMaxId, setNextMaxId] = useState<string | null>(null)

	useEffect(() => {
		const f = async () => {
			setLoading(true)
			try {
				const f = await loadFollowers(user, client)
				setFollowers(f)
				if (account) {
					const r = await loadRelationship(f, client)
					setRelationships(r)
				}
			} finally {
				setLoading(false)
			}
		}
		f()
	}, [client, user, account])

	useImperativeHandle(ref, () => ({
		async loadMore() {
			console.debug('appending')
			if (loadingMore || followers.length <= 0) return
			try {
				setLoadingMore(true)
				if (nextMaxId) {
					const f = await loadFollowers(user, client, nextMaxId)
					setFollowers((current) => [...current, ...f])
					if (account) {
						const r = await loadRelationship(f, client)
						setRelationships((current) => [...current, ...r])
					}
				}
			} finally {
				setLoadingMore(false)
			}
		},
	}))

	const loadFollowers = async (user: Entity.Account, client: MegalodonInterface, maxId?: string): Promise<Array<Entity.Account>> => {
		let options = { limit: TIMELINE_STATUSES_COUNT }
		if (maxId) {
			options = Object.assign({}, options, { max_id: maxId })
		}
		const res = await client.getAccountFollowers(user.id, options)
		const link = parse(res.headers.link)
		if (link !== null && link.next) {
			setNextMaxId(link.next.max_id)
		} else {
			setNextMaxId(null)
		}
		return res.data
	}

	const loadRelationship = async (users: Array<Entity.Account>, client: MegalodonInterface): Promise<Array<Entity.Relationship>> => {
		const ids = users.map((a) => a.id)
		const rel = await client.getRelationships(ids)
		return rel.data
	}

	const follow = async (user: Entity.Account) => {
		const res = await client.followAccount(user.id)
		setRelationships((current) =>
			current.map((r) => {
				if (r.id === res.data.id) {
					return res.data
				}
				return r
			}),
		)
	}

	const unfollow = async (user: Entity.Account) => {
		const res = await client.unfollowAccount(user.id)
		setRelationships((current) =>
			current.map((r) => {
				if (r.id === res.data.id) {
					return res.data
				}
				return r
			}),
		)
	}

	const targetRelationship = (user: Entity.Account) => {
		return relationships.find((r) => r.id === user.id)
	}

	return (
		<div style={{ width: '100%' }}>
			{loading ? (
				<div style={{ textAlign: 'center' }}>
					<Loader style={{ margin: '5em auto' }} />
				</div>
			) : (
				<List>
					{followers.map((account) => (
						<List.Item key={account.id} style={{ padding: '4px 0' }}>
							<User user={account} relationship={targetRelationship(account)} follow={follow} unfollow={unfollow} />
						</List.Item>
					))}
				</List>
			)}
		</div>
	)
}

export default Followers
