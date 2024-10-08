import Status from '@/components/timelines/status/Status'
import { TIMELINE_STATUSES_COUNT } from '@/defaults'
import type { Account } from '@/entities/account'
import type { CustomEmojiCategory } from '@/entities/emoji'
import type { Server } from '@/entities/server'
import { mapCustomEmojiCategory } from '@/utils/emojiData'
import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import { useRouter } from 'next/router'
import { useEffect, useImperativeHandle, useState } from 'react'
import { List, Loader } from 'rsuite'

export type FuncProps = {
	loadMore: () => Promise<void>
}

type ArgProps = {
	client: MegalodonInterface
	user: Entity.Account
	server: Server
	account: Account | null
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	openReport: (status: Entity.Status, client: MegalodonInterface) => void
	openFromOtherAccount: (status: Entity.Status) => void
}

const Posts: React.ForwardRefRenderFunction<FuncProps, ArgProps> = (props, ref) => {
	const { client, user } = props
	const [pinned, setPinned] = useState<Array<Entity.Status>>([])
	const [statuses, setStatuses] = useState<Array<Entity.Status>>([])
	const [loading, setLoading] = useState<boolean>(false)
	const [loadingMore, setLoadingMore] = useState<boolean>(false)
	const [customEmojis, setCustomEmojis] = useState<Array<CustomEmojiCategory>>([])

	const router = useRouter()

	useEffect(() => {
		const f = async () => {
			setLoading(true)
			try {
				const pin = await client.getAccountStatuses(user.id, { limit: TIMELINE_STATUSES_COUNT, pinned: true })
				setPinned(pin.data)
				const res = await client.getAccountStatuses(user.id, { limit: TIMELINE_STATUSES_COUNT })
				setStatuses(res.data)
			} finally {
				setLoading(false)
			}
			const emojis = await client.getInstanceCustomEmojis()
			setCustomEmojis(mapCustomEmojiCategory(props.server.domain, emojis.data))
		}
		f()
	}, [user, client])

	useImperativeHandle(ref, () => ({
		async loadMore() {
			console.debug('appending')
			if (loadingMore || statuses.length <= 0) return
			try {
				setLoadingMore(true)
				const maxId = statuses[statuses.length - 1].id
				const res = await client.getAccountStatuses(user.id, { max_id: maxId, limit: TIMELINE_STATUSES_COUNT })
				setStatuses((last) => [...last, ...res.data])
			} finally {
				setLoadingMore(false)
			}
		},
	}))

	const updateStatus = (status: Entity.Status) => {
		const renew = statuses.map((s) => {
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
		setStatuses(renew)
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

	return (
		<div style={{ width: '100%' }}>
			{loading ? (
				<div style={{ textAlign: 'center' }}>
					<Loader style={{ margin: '5em auto' }} />
				</div>
			) : (
				<List>
					{pinned.map((status) => (
						<List.Item key={status.id} style={{ paddingTop: '2px', paddingBottom: '2px', backgroundColor: 'var(rs-bg-card)' }}>
							<Status
								status={status}
								client={client}
								server={props.server}
								account={props.account}
								columnWidth={340}
								pinned={true}
								updateStatus={updateStatus}
								openMedia={props.openMedia}
								setAccountDetail={setAccountDetail}
								setTagDetail={setTagDetail}
								openReport={props.openReport}
								openFromOtherAccount={props.openFromOtherAccount}
								customEmojis={customEmojis}
							/>
						</List.Item>
					))}
					{statuses.map((status) => (
						<List.Item key={status.id} style={{ paddingTop: '2px', paddingBottom: '2px', backgroundColor: 'var(rs-bg-card)' }}>
							<Status
								status={status}
								client={client}
								server={props.server}
								account={props.account}
								columnWidth={340}
								updateStatus={updateStatus}
								openMedia={props.openMedia}
								setAccountDetail={setAccountDetail}
								setTagDetail={setTagDetail}
								openReport={props.openReport}
								openFromOtherAccount={props.openFromOtherAccount}
								customEmojis={customEmojis}
							/>
						</List.Item>
					))}
				</List>
			)}
		</div>
	)
}

export default Posts
