import generator, { type WebSocketInterface, detector } from '@cutls/megalodon'
import { createContext, useEffect, useState } from 'react'
import { getAccount, listServers, listTimelines } from './utils/storage'
import { set } from 'rsuite/esm/utils/dateUtils'
import { defaultSetting, type Settings } from './entities/settings'
import type { Timeline } from './entities/timeline'
import type { Server } from './entities/server'

export const TheDeskContext = createContext({
	start: async (timelines: Array<[Timeline, Server]>) => [] as WebSocketInterface[],
	listen: ((channel: string, callback: any, tts?: boolean) => null) as <T>(channel: string, callback: (a: { payload: T }) => void, tts?: boolean) => void | null,
	allClose: () => { },
	timelineRefresh: () => { },
	latestTimelineRefreshed: new Date().getTime(),
	timelineConfig: defaultSetting.timeline,
	saveTimelineConfig: (config: Settings['timeline']) => { }
})
const stripForVoice = (html: string) => {
	const div = document.createElement("div")
	div.innerHTML = html
	const text = div.textContent || div.innerText || ""
	const protomatch = /(https?|ftp):\/\//g
	const b = text.replace(protomatch, '').replace(/:[a-zA-Z0-9_]:/g, '')
	return b
}
export const TheDeskProviderWrapper: React.FC = (props) => {
	const [latestTimelineRefreshed, setLatestTimelineRefreshed] = useState(0)
	const [timelineConfig, setTimelineConfig] = useState<Settings['timeline']>(defaultSetting.timeline)
	const saveTimelineConfig = (config: Settings['timeline']) => setTimelineConfig(config)
	const start = async (timelines: Array<[Timeline, Server]>) => new Promise<WebSocketInterface[] | null>((resolve, reject) => {
		const fn = async () => {
			const streamings: WebSocketInterface[] = []
			let i = 0
			for (const [timeline, server] of timelines) {
				if (!server || !server.account_id) continue
				const accountId = server.account_id
				const [account] = await getAccount({ id: accountId })
				const sns = await detector(server.base_url)
				const client = generator(sns, server.base_url, account?.access_token, 'TheDesk(Desktop)')
				const noStreaming = server.no_streaming

				let streaming: WebSocketInterface = undefined
				try {
					if (!noStreaming && timeline.kind === 'public') streaming = await client.publicStreaming()
					if (!noStreaming && timeline.kind === 'local') streaming = await client.localStreaming()
					if (!noStreaming && timeline.kind === 'direct') streaming = await client.directStreaming()
					if (!noStreaming && timeline.kind === 'list') streaming = await client.listStreaming(timeline.list_id)
					if (!noStreaming && timeline.kind === 'tag') streaming = await client.tagStreaming(timeline.name)
				} catch {
					console.error('skipped')
				}
				streamings.push(streaming)
				i++
			}
			const userStreamings: WebSocketInterface[] = []

			const servers = await listServers()
			for (const [server, account] of servers) {
				const noStreaming = server.no_streaming
				const sns = await detector(server.base_url)
				if (!account || !account.access_token) continue
				const client = generator(sns, server.base_url, account.access_token)
				const streaming = !noStreaming ? await client.userStreaming() : undefined
				userStreamings.push(streaming)
			}
			window.streamings = streamings
			window.userStreamings = userStreamings
			console.log('resolver')
			resolve(streamings)
		}
		fn()
	})
	const listen = async (channel: string, callback: any, tts?: boolean) => {
		const useStreaming = window.streamings
		while (useStreaming.length === 0) {
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
		if (channel === 'receive-timeline-status') {
			for (let i = 0; i < useStreaming.length; i++) {
				const streaming = useStreaming[i]
				if (!streaming) continue
				streaming.on('update', (status) => {
					if (tts) {
						const html = status.content
						const b = stripForVoice(html)
						const synthApi = window.speechSynthesis
						const utter = new SpeechSynthesisUtterance(b)
						synthApi.speak(utter)
					}
					callback({ payload: { status: status, timeline_id: i + 1 } })
				})
			}
		}
		if (channel === 'receive-timeline-conversation') {
			for (let i = 0; i < useStreaming.length; i++) {
				const streaming = useStreaming[i]
				if (!streaming) continue
				streaming.on('conversation', (status) => {
					callback({ payload: { conversation: status, timeline_id: i + 1 } })
				})
			}
		}
		if (channel === 'receive-timeline-status-update') {
			for (let i = 0; i < useStreaming.length; i++) {
				const streaming = useStreaming[i]
				if (!streaming) continue
				streaming.on('status.update', (status) => {
					callback({ payload: { status: status, timeline_id: i + 1 } })
				})
			}
		}
		if (channel === 'delete-timeline-status') {
			for (let i = 0; i < useStreaming.length; i++) {
				const streaming = useStreaming[i]
				if (!streaming) continue
				streaming.on('delete', (id) => {
					callback({ payload: { status_id: id, timeline_id: i + 1 } })
				})
			}
		}
		const userStreamings = window.userStreamings
		while (userStreamings.length === 0) {
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
		if (channel === 'receive-home-status') {
			for (let i = 0; i < userStreamings.length; i++) {
				const streaming = userStreamings[i]
				if (!streaming) continue
				streaming.on('update', (status) => {
					if (tts) {
						const html = status.content
						const b = stripForVoice(html)
						const synthApi = window.speechSynthesis
						const utter = new SpeechSynthesisUtterance(b)
						synthApi.speak(utter)
					}
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
			for (const streaming of window.streamings) streaming?.removeListener(channel, callback)
			for (const streaming of window.userStreamings) streaming?.removeListener(channel, callback)
		}
	}

	const allClose = async () => {
		const streamingState = window.streamings
		console.log('allClosed', streamingState)
		if (streamingState.length === 0) return
		for (const streaming of streamingState) streaming?.removeAllListeners()
		for (const streaming of streamingState) streaming?.stop()
		window.streamings = []
		const userStreamingState = window.userStreamings
		if (userStreamingState.length === 0) return
		for (const streaming of userStreamingState) streaming?.removeAllListeners()
		for (const streaming of userStreamingState) streaming?.stop()
		window.userStreamings = []
	}
	const timelineRefresh = () => {
		setLatestTimelineRefreshed(new Date().getTime())
	}

	return <TheDeskContext.Provider value={{ listen, start, allClose, timelineRefresh, latestTimelineRefreshed, timelineConfig, saveTimelineConfig }}>{props.children}</TheDeskContext.Provider>
}
