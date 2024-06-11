import generator, { type WebSocketInterface, detector } from '@cutls/megalodon'
import { createContext, useEffect, useState } from 'react'
import { getAccount, listServers, listTimelines } from './utils/storage'
import { set } from 'rsuite/esm/utils/dateUtils'
import { defaultSetting, type Settings } from './entities/settings'
import type { Timeline } from './entities/timeline'
import type { Server } from './entities/server'

export const TheDeskContext = createContext({
	start: async (timelines: Array<[Timeline, Server]>) => [] as StreamingArray[],
	listen: ((channel: string, callback: any, tts?: boolean) => null) as <T>(channel: string, callback: (a: { payload: T }) => void, tts?: boolean) => void | null,
	allClose: () => { },
	timelineRefresh: () => { },
	latestTimelineRefreshed: new Date().getTime(),
	timelineConfig: defaultSetting.timeline,
	saveTimelineConfig: (config: Settings['timeline']) => { },
	focused: false,
	setFocused: (focused: boolean) => { }
})
const stripForVoice = (html: string) => {
	const div = document.createElement("div")
	div.innerHTML = html
	const text = div.textContent || div.innerText || ""
	const protomatch = /(https?|ftp):\/\//g
	const b = text.replace(protomatch, '').replace(/:[a-zA-Z0-9_]:/g, '')
	return b
}
type StreamingArray = [number, WebSocketInterface]
export const TheDeskProviderWrapper: React.FC = (props) => {
	const [focused, setFocused] = useState(false)
	const [latestTimelineRefreshed, setLatestTimelineRefreshed] = useState(0)
	const [timelineConfig, setTimelineConfig] = useState<Settings['timeline']>(defaultSetting.timeline)
	const saveTimelineConfig = (config: Settings['timeline']) => setTimelineConfig(config)
	const start = async (timelines: Array<[Timeline, Server]>) => new Promise<StreamingArray[] | null>((resolve, reject) => {
		const fn = async () => {
			const streamings: StreamingArray[] = []
			let i = 0
			for (const [timeline, server] of timelines) {
				if (!server || !server.account_id) continue
				const accountId = server.account_id
				const [account] = await getAccount({ id: accountId })
				const sns = await detector(server.base_url)
				const client = generator(sns, server.base_url, account?.access_token, 'TheDesk(Desktop)')
				const noStreaming = server.no_streaming

				let streaming: StreamingArray = undefined
				try {
					if (!noStreaming && timeline.kind === 'public') streaming = [timeline.id, await client.publicStreaming()]
					if (!noStreaming && timeline.kind === 'public:media') streaming = [timeline.id, await client.publicStreaming()]
					if (!noStreaming && timeline.kind === 'local') streaming = [timeline.id, await client.localStreaming()]
					if (!noStreaming && timeline.kind === 'direct') streaming = [timeline.id, await client.directStreaming()]
					if (!noStreaming && timeline.kind === 'list') streaming = [timeline.id, await client.listStreaming(timeline.list_id)]
					if (!noStreaming && timeline.kind === 'tag') streaming = [timeline.id, await client.tagStreaming(timeline.name)]
				} catch {
					console.error('skipped')
				}
				streamings.push(streaming || [timeline.id, undefined])
				i++
			}
			const userStreamings: StreamingArray[] = []

			const servers = await listServers()
			for (const [server, account] of servers) {
				const noStreaming = server.no_streaming
				const sns = await detector(server.base_url)
				if (!account || !account.access_token) continue
				const client = generator(sns, server.base_url, account.access_token)
				const streaming = !noStreaming ? await client.userStreaming() : undefined
				userStreamings.push([server.id, streaming])
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
			console.log('waiting1')
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
		if (channel === 'receive-timeline-status') {
			for (let i = 0; i < useStreaming.length; i++) {
				const streaming = useStreaming[i][1]
				if (!streaming) continue
				streaming.on('update', (status) => {
					if (tts) {
						const html = status.content
						const b = stripForVoice(html)
						const synthApi = window.speechSynthesis
						const utter = new SpeechSynthesisUtterance(b)
						synthApi.speak(utter)
					}
					callback({ payload: { status: status, timeline_id: useStreaming[i][0] } })
				})
			}
		}
		if (channel === 'receive-timeline-media') {
			for (let i = 0; i < useStreaming.length; i++) {
				const streaming = useStreaming[i][1]
				if (!streaming) continue
				streaming.on('update', (status) => {
					if (status.media_attachments.length === 0) return
					if (tts) {
						const html = status.content
						const b = stripForVoice(html)
						const synthApi = window.speechSynthesis
						const utter = new SpeechSynthesisUtterance(b)
						synthApi.speak(utter)
					}
					callback({ payload: { status: status, timeline_id: useStreaming[i][0] } })
				})
			}
		}
		if (channel === 'receive-timeline-conversation') {
			for (let i = 0; i < useStreaming.length; i++) {
				const streaming = useStreaming[i][1]
				if (!streaming) continue
				streaming.on('conversation', (status) => {
					callback({ payload: { conversation: status, timeline_id: useStreaming[i][0] } })
				})
			}
		}
		if (channel === 'receive-timeline-status-update') {
			for (let i = 0; i < useStreaming.length; i++) {
				const streaming = useStreaming[i][1]
				if (!streaming) continue
				streaming.on('status.update', (status) => {
					callback({ payload: { status: status, timeline_id: useStreaming[i][0] } })
				})
			}
		}
		if (channel === 'delete-timeline-status') {
			for (let i = 0; i < useStreaming.length; i++) {
				const streaming = useStreaming[i][1]
				if (!streaming) continue
				streaming.on('delete', (id) => {
					callback({ payload: { status_id: id, timeline_id: useStreaming[i][0] } })
				})
			}
		}
		const userStreamings = window.userStreamings
		while (userStreamings.length === 0) {
			console.log('waiting2')
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
		if (channel === 'receive-home-status') {
			for (let i = 0; i < userStreamings.length; i++) {
				const streaming = userStreamings[i][1]
				if (!streaming) continue
				streaming.on('update', (status) => {
					if (tts) {
						const html = status.content
						const b = stripForVoice(html)
						const synthApi = window.speechSynthesis
						const utter = new SpeechSynthesisUtterance(b)
						synthApi.speak(utter)
					}
					callback({ payload: { status: status, server_id: userStreamings[i][0] } })
				})
			}
		}
		if (channel === 'receive-home-status-update') {
			for (let i = 0; i < userStreamings.length; i++) {
				const streaming = userStreamings[i][1]
				if (!streaming) continue
				streaming.on('status.update', (status) => {
					callback({ payload: { status: status, server_id: userStreamings[i][0] } })
				})
			}
		}
		if (channel === 'delete-home-status') {
			for (let i = 0; i < userStreamings.length; i++) {
				const streaming = userStreamings[i][1]
				if (!streaming) continue
				streaming.on('delete', (id) => {
					callback({ payload: { status_id: id, server_id: userStreamings[i][0] } })
				})
			}
		}
		if (channel === 'receive-notification') {
			for (let i = 0; i < userStreamings.length; i++) {
				const streaming = userStreamings[i][1]
				if (!streaming) continue
				streaming.on('notification', (mes) => {
					callback({ payload: { notification: mes, server_id: userStreamings[i][0] } })
				})
			}
		}

		return () => {
			for (const streaming of window.streamings) streaming[1]?.removeListener(channel, callback)
			for (const streaming of window.userStreamings) streaming[1]?.removeListener(channel, callback)
		}
	}

	const allClose = async () => {
		const streamingState = window.streamings
		console.log('allClosed', streamingState)
		if (streamingState.length === 0) return
		for (const streaming of streamingState) streaming[1]?.removeAllListeners()
		for (const streaming of streamingState) streaming[1]?.stop()
		window.streamings = []
		const userStreamingState = window.userStreamings
		if (userStreamingState.length === 0) return
		for (const streaming of userStreamingState) streaming[1]?.removeAllListeners()
		for (const streaming of userStreamingState) streaming[1]?.stop()
		window.userStreamings = []
	}
	const timelineRefresh = () => {
		setLatestTimelineRefreshed(new Date().getTime())
	}

	return <TheDeskContext.Provider value={{ listen, start, allClose, timelineRefresh, latestTimelineRefreshed, timelineConfig, saveTimelineConfig, focused, setFocused }}>{props.children}</TheDeskContext.Provider>
}
