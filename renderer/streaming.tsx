import generator, { type WebSocketInterface, detector } from 'megalodon'
import { createContext, useEffect, useState } from 'react'
import { Account } from './entities/account'
import { Server } from './entities/server'
import { Timeline } from './entities/timeline'
import { getAccount, getServer, listAccounts, listServers, listTimelines } from './utils/storage'

export const StreamingContext = createContext({
	start: async () => {},
	listen: ((channel: string, callback: any) => null) as <T>(channel: string, callback: (a: { payload: T }) => void) => void | null,
	allClose: () => {},
	timelineRefresh: () => {},
	latestTimelineRefreshed: new Date().getTime(),
})

export const StreamingProviderWrapper: React.FC = (props) => {
	const streamings: WebSocketInterface[] = []
	const userStreamings: WebSocketInterface[] = []
	const [latestTimelineRefreshed, setLatestTimelineRefreshed] = useState(new Date().getTime())
	const start = async () => {
		const timelines = await listTimelines()
		for (const [timeline, server] of timelines) {
			const accountId = server.account_id
			const [account] = await getAccount({ id: accountId })
			const sns = await detector(server.base_url)
			const client = generator(sns, server.base_url, account.access_token)
			let streaming: WebSocketInterface
			if (timeline.kind === 'public') streaming = await client.publicStreaming()
			if (timeline.kind === 'local') streaming = await client.localStreaming()
			if (timeline.kind === 'direct') streaming = await client.directStreaming()
			if (timeline.kind === 'list') streaming = await client.listStreaming(timeline.list_id)
			if (timeline.kind === 'tag') streaming = await client.tagStreaming(timeline.name)
			streamings.push(streaming)
		}

		const servers = await listServers()
		for (const [server, account] of servers) {
			const sns = await detector(server.base_url)
			if (!account || !account.access_token) continue
			const client = generator(sns, server.base_url, account.access_token)
			const streaming: WebSocketInterface = await client.userStreaming()
			userStreamings.push(streaming)
		}
	}
	const listen = async (channel: string, callback: any) => {
		while (streamings.length === 0) {
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
		if (channel === 'receive-timeline-status') {
			for (let i = 0; i < streamings.length; i++) {
				const streaming = streamings[i]
				if (!streaming) continue
				streaming.on('update', (status) => {
					callback({ payload: { status: status, timeline_id: i + 1 } })
				})
			}
		}
		if (channel === 'receive-timeline-conversation') {
			for (let i = 0; i < streamings.length; i++) {
				const streaming = streamings[i]
				if (!streaming) continue
				streaming.on('conversation', (status) => {
					callback({ payload: { conversation: status, timeline_id: i + 1 } })
				})
			}
		}
		if (channel === 'receive-timeline-status-update') {
			for (let i = 0; i < streamings.length; i++) {
				const streaming = streamings[i]
				if (!streaming) continue
				streaming.on('status.update', (status) => {
					callback({ payload: { status: status, timeline_id: i + 1 } })
				})
			}
		}
		if (channel === 'delete-timeline-status') {
			for (let i = 0; i < streamings.length; i++) {
				const streaming = streamings[i]
				if (!streaming) continue
				streaming.on('delete', (id) => {
					callback({ payload: { status_id: id, timeline_id: i + 1 } })
				})
			}
		}
		while (userStreamings.length === 0) {
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
		if (channel === 'receive-home-status') {
			for (let i = 0; i < userStreamings.length; i++) {
				const streaming = userStreamings[i]
				if (!streaming) continue
				streaming.on('update', (status) => {
					callback({ payload: { status: status, server_id: i + 1 } })
				})
			}
		}
		if (channel === 'receive-home-status-update') {
			for (let i = 0; i < userStreamings.length; i++) {
				const streaming = userStreamings[i]
				if (!streaming) continue
				streaming.on('status.update', (status) => {
					callback({ payload: { status: status, server_id: i + 1 } })
				})
			}
		}
		if (channel === 'delete-home-status') {
			for (let i = 0; i < userStreamings.length; i++) {
				const streaming = userStreamings[i]
				if (!streaming) continue
				streaming.on('delete', (id) => {
					callback({ payload: { status_id: id, server_id: i + 1 } })
				})
			}
		}
		if (channel === 'receive-notification') {
			for (let i = 0; i < userStreamings.length; i++) {
				const streaming = userStreamings[i]
				if (!streaming) continue
				streaming.on('notification', (mes) => {
					callback({ payload: { notification: mes, server_id: i + 1 } })
				})
			}
		}

		return () => {
			for (const streaming of streamings) streaming.removeListener(channel, callback)
		}
	}
	const allClose = () => {
		for (const streaming of streamings) streaming.stop()
	}
	const timelineRefresh = () => {
		setLatestTimelineRefreshed(new Date().getTime())
	}

	return <StreamingContext.Provider value={{ listen, start, allClose, timelineRefresh, latestTimelineRefreshed }}>{props.children}</StreamingContext.Provider>
}
