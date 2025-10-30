import generator, { detector, type Entity, type WebSocketInterface } from '@cutls/megalodon'
import { createContext, useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import type { Server } from './entities/server'
import { defaultSetting, type Settings } from './entities/settings'
import type { Timeline, TimelineKind } from './entities/timeline'
import { getAccount, listServers, listTimelines } from './utils/storage'

export const TheDeskContext = createContext({
	start: async (timelines: Array<[Timeline, Server]>) => () => null,
	listenUser: ((channel: string, callback: any, tts?: boolean) => null) as <T>(channel: string, callback: (a: { payload: T }) => void, tts?: boolean) => {},
	listenTimeline: ((channel: string, callback: any, tts?: boolean) => null) as <T>(channel: string, callback: (a: { payload: T }) => void, tts?: boolean) => {},
	allClose: () => {},
	latestTimelineRefreshed: new Date().getTime(),
	timelineConfig: defaultSetting.timeline,
	saveTimelineConfig: (config: Settings['timeline']) => {},
	focused: false,
	setFocused: (focused: boolean) => {}
})
export const TimelineRefreshContext = createContext({
	timelineRefresh: () => {}
})
const stripForVoice = (html: string) => {
	const div = document.createElement('div')
	div.innerHTML = html
	const text = div.textContent || div.innerText || ''
	const protomatch = /(https?|ftp)(:\/\/[\w\/:%#\$&\?\(\)~\.=\+\-]+)/g
	const b = text.replace(protomatch, '')
	return b
}
// 'home' | 'notifications' | 'local' | 'public' | 'favourites' | 'list' | 'bookmarks' | 'direct' | 'tag'
type StreamingArray = [number, WebSocketInterface, string]
export const TheDeskProviderWrapper: React.FC = (props) => {
	const [focused, setFocused] = useState(false)
	const [latestTimelineRefreshed, setLatestTimelineRefreshed] = useState(0)
	const [timelineConfig, setTimelineConfig] = useState<Settings['timeline']>(defaultSetting.timeline)
	const saveTimelineConfig = (config: Settings['timeline']) => setTimelineConfig(config)
	const start = async (timelines: Array<[Timeline, Server]>) => {
		const fn = async () => {
			const userStreamings: StreamingArray[] = []
			const servers = await listServers()
			for (const [server, account] of servers) {
				const noStreaming = server.no_streaming
				try {
					const sns = await detector(server.base_url)
					if (!account || !account.access_token) continue
					const client = generator(sns, server.base_url, account.access_token)
					const streaming = !noStreaming ? await client.userStreamingSubscription() : undefined
					userStreamings.push([server.id, streaming, 'home'])
				} catch {
					console.error('skipped user streaming')
				}
			}

			const streamings: StreamingArray[] = []
			let i = 0
			for (const [timeline, server] of timelines) {
				if (!server || !server.account_id) continue

				let streaming: StreamingArray
				try {
					const accountId = server.account_id
					const [account] = await getAccount({ id: accountId })
					const sns = await detector(server.base_url)
					const client = generator(sns, server.base_url, account?.access_token, 'TheDesk(Desktop)')
					const noStreaming = server.no_streaming
					const targetSocket = userStreamings.find(([id]) => id === server.id)[1]
					if (!noStreaming && timeline.kind === 'public') await client.publicStreamingSubscription(targetSocket)
					if (!noStreaming && timeline.kind === 'local') await client.localStreamingSubscription(targetSocket)
					if (!noStreaming && timeline.kind === 'direct') await client.directStreamingSubscription(targetSocket)
					if (!noStreaming && timeline.kind === 'list') await client.listStreamingSubscription(targetSocket, timeline.list_id)
					if (!noStreaming && timeline.kind === 'tag') await client.tagStreamingSubscription(targetSocket, timeline.name)
					if (!noStreaming && timeline.kind === 'public') streaming = [timeline.id, targetSocket, 'public']
					if (!noStreaming && timeline.kind === 'local') streaming = [timeline.id, targetSocket, 'public:local']
					if (!noStreaming && timeline.kind === 'direct') streaming = [timeline.id, targetSocket, 'direct']
					if (!noStreaming && timeline.kind === 'list') streaming = [timeline.id, targetSocket, 'list']
					if (!noStreaming && timeline.kind === 'tag') streaming = [timeline.id, targetSocket, 'tag']
				} catch {
					console.error('skipped')
				}
				streamings.push(streaming || [timeline.id, undefined, timeline.kind])
				i++
			}
			window.streamings = streamings
			window.userStreamings = userStreamings
			console.log('resolver')
		}
		await fn()
		return () => {
			allClose()
			return null
		}
	}
	const listenTimeline = async (channel: string, callback: any, tts?: boolean) => {
		const useStreaming = window.streamings
		// while (!useStreaming || useStreaming.length === 0) {
		// 	console.log('waiting1')
		// 	await new Promise((resolve) => setTimeout(resolve, 1000))
		// }
		if (channel === 'receive-timeline-status') {
			for (let i = 0; i < useStreaming.length; i++) {
				const streaming = useStreaming[i][1]
				const timelineKind = useStreaming[i][2]
				if (!streaming) continue
				const id = Date.now()
				streaming.on('update', (status, ch) => {
					const isBouyomi = timelineConfig.ttsProvider === 'bouyomi'
					if (tts) {
						const html = status.content
						const b = stripForVoice(html)
						if (isBouyomi) {
							try {
								fetch(`http://localhost:${timelineConfig.ttsPort}/Talk?text=${encodeURIComponent(b)}`)
							} catch {
								console.error('Cannot TTS')
							}
						} else {
							const synthApi = window.speechSynthesis
							const utter = new SpeechSynthesisUtterance(b)
							synthApi.speak(utter)
						}
					}
					if (!ch || ch.includes(timelineKind)) callback({ payload: { status: status, timeline_id: useStreaming[i][0] }, kind: ch })
				})
			}
		}
		if (channel === 'receive-timeline-conversation') {
			for (let i = 0; i < useStreaming.length; i++) {
				const streaming = useStreaming[i][1]
				const timelineKind = useStreaming[i][2]
				if (!streaming) continue
				streaming.on('conversation', (status, ch) => {
					if (!ch || ch.includes(timelineKind)) callback({ payload: { conversation: status, timeline_id: useStreaming[i][0] }, kind: ch })
				})
			}
		}
		if (channel === 'receive-timeline-status-update') {
			for (let i = 0; i < useStreaming.length; i++) {
				const streaming = useStreaming[i][1]
				const timelineKind = useStreaming[i][2]
				if (!streaming) continue
				streaming.on('status.update', (status, ch) => {
					if (!ch || ch.includes(timelineKind)) callback({ payload: { status: status, timeline_id: useStreaming[i][0] }, kind: ch })
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
	}
	const listenUser = async (channel: string, callback: any, tts?: boolean) => {
		const userStreamings = window.userStreamings
		// while (!userStreamings || userStreamings.length === 0) {
		// 	console.log('waiting2 for', channel)
		// 	await new Promise((resolve) => setTimeout(resolve, 1000))
		// }
		if (channel === 'receive-home-status') {
			for (let i = 0; i < userStreamings.length; i++) {
				const streaming = userStreamings[i][1]
				if (!streaming) continue
				streaming.on('update', (status, ch) => {
					const isBouyomi = timelineConfig.ttsProvider === 'bouyomi'
					if (tts) {
						const html = status.content
						const b = stripForVoice(html)
						if (isBouyomi) {
							try {
								fetch(`http://localhost:${timelineConfig.ttsPort}/Talk?text=${encodeURIComponent(b)}`)
							} catch {
								console.error('Cannot TTS')
							}
						} else {
							const synthApi = window.speechSynthesis
							const utter = new SpeechSynthesisUtterance(b)
							synthApi.speak(utter)
						}
					}
					if (!ch || ch.includes('user')) callback({ payload: { status: status, server_id: userStreamings[i][0] } })
				})
			}
		}
		if (channel === 'receive-home-status-update') {
			for (let i = 0; i < userStreamings.length; i++) {
				const streaming = userStreamings[i][1]
				if (!streaming) continue
				streaming.on('status_update', (status, ch) => {
					if (!ch || ch.includes('user')) callback({ payload: { status: status, server_id: userStreamings[i][0] } })
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
				streaming.on('notification', (mes, ch) => {
					callback({ payload: { notification: mes, server_id: userStreamings[i][0] } })
				})
			}
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

		await new Promise((resolve) => setTimeout(resolve, 1000))
		return
	}

	return (
		<TheDeskContext.Provider value={{ listenUser, listenTimeline, start, allClose, latestTimelineRefreshed, timelineConfig, saveTimelineConfig, focused, setFocused }}>
			{props.children}
		</TheDeskContext.Provider>
	)
}
