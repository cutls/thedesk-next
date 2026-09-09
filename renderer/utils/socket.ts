import type { Timeline } from '@/entities/timeline'
import generator, { type WebSocketInterface } from '@cutls/megalodon'
import { listServers, getAccount } from './storage'
import type { Server } from '@/entities/server'
import type { Settings } from '@/entities/settings'
import type { Account } from '@/entities/account'
import { stripTagAndLink } from './statusParser'

// 'home' | 'notifications' | 'local' | 'public' | 'favourites' | 'list' | 'bookmarks' | 'direct' | 'tag' | 'integrated'
type StreamingArray = [number, WebSocketInterface, string, string?]
export const speech = (text: string, timelineConfig: Settings['timeline']) => {
	const synthApi = window.speechSynthesis
	const utter = new SpeechSynthesisUtterance(text)
	utter.pitch = timelineConfig.ttsPitch
	utter.rate = timelineConfig.ttsRate
	utter.volume = timelineConfig.ttsVolume / 100
	if (timelineConfig.ttsVoice) {
		const voice = synthApi.getVoices().find((v) => v.voiceURI === timelineConfig.ttsVoice)
		if (voice) utter.voice = voice
	}
	synthApi.speak(utter)
}
export const start = async (timelines: Array<[Timeline, Server, Account]>, generateStreaming: boolean) => {
	const fn = async () => {
		const userStreamings: StreamingArray[] = !generateStreaming ? window.userStreamings : []
		if (generateStreaming) {
			const servers = await listServers()
			for (const [server, account] of servers) {
				const noStreaming = server.no_streaming
				const isSubscribable = !server.cannot_subscribe
				try {
					const client = generator(server.sns, server.base_url, account?.access_token)
					const streaming = !noStreaming && (isSubscribable || account) ? await client.userStreamingSubscription() : undefined
					userStreamings.push([server.id, streaming, 'home'])
				} catch (e) {
					console.error(e)
					console.error('skipped user streaming')
				}
			}
		}

		const streamings: StreamingArray[] = []
		for (const [timeline, server] of timelines) {
			if (!server) continue

			let streaming: StreamingArray
			try {
				const accountId = server.account_id
				const [account] = accountId ? await getAccount({ id: accountId }) : [null]
				const client = generator(server.sns, server.base_url, account?.access_token, 'TheDesk(Desktop)')
				const noStreaming = server.no_streaming
				const isSubscribable = !server.cannot_subscribe
				if (noStreaming) continue
				const targetSocket = userStreamings.find(([id]) => id === server.id)[1]
				let newStreaming: WebSocketInterface = null
				if (timeline.kind === 'public') newStreaming = isSubscribable ? await client.publicStreamingSubscription(targetSocket) : await client.publicStreaming()
				if (timeline.kind === 'local') newStreaming = isSubscribable ? await client.localStreamingSubscription(targetSocket) : await client.localStreaming()
				if (timeline.kind === 'direct') newStreaming = isSubscribable ? await client.directStreamingSubscription(targetSocket) : await client.directStreaming()
				if (timeline.kind === 'list') newStreaming = isSubscribable ? await client.listStreamingSubscription(targetSocket, timeline.list_id) : await client.listStreaming(timeline.list_id)
				if (timeline.kind === 'tag') newStreaming = isSubscribable ? await client.tagStreamingSubscription(targetSocket, timeline.name) : await client.tagStreaming(timeline.name)
				if (timeline.kind === 'integrated') newStreaming = isSubscribable ? await client.localStreamingSubscription(targetSocket) : null
					
				
				if (timeline.kind === 'public') streaming = [timeline.id, newStreaming, 'public']
				if (timeline.kind === 'local') streaming = [timeline.id, newStreaming, 'public:local']
				if (timeline.kind === 'direct') streaming = [timeline.id, newStreaming, 'direct']
				if (timeline.kind === 'list') streaming = [timeline.id, newStreaming, 'list', timeline.list_id]
				if (timeline.kind === 'tag') streaming = [timeline.id, newStreaming, 'hashtag', timeline.name]
				if (timeline.kind === 'integrated') streaming = [timeline.id, newStreaming, 'integrated']
			} catch {
				console.error('skipped')
			}
			streamings.push(streaming || [timeline.id, undefined, timeline.kind])
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
export const listenTimelineWaiter = async (timelineId: number) => {
	while ((window.streamings || []).findIndex((s: [number, WebSocketInterface, string]) => s[0] === timelineId) < 0) {
		console.log('waiting for timeline listener')
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}
}
const includeTL = (chs: string[], kind: string ) => kind === 'integrated' ? (chs.includes('home') || chs.includes('public:local')) : chs.includes(kind)
export const listenTimeline = async <T>(channel: string, callback: (a: { payload: T; kind?: string }) => void, timelineConfig: Settings['timeline'], tts: boolean) => {
	const useStreaming = window.streamings
	// while (!useStreaming || useStreaming.length === 0) {
	// 	console.log('waiting1')
	// 	await new Promise((resolve) => setTimeout(resolve, 1000))
	// }
	if (channel === 'receive-timeline-status') {
		for (let i = 0; i < useStreaming.length; i++) {
			const streaming = useStreaming[i][1]
			const timelineKind = useStreaming[i][2]
			const timelineAdd = useStreaming[i][3]
			if (!streaming) continue
			streaming.on('update', (status, ch) => {
				const isBouyomi = timelineConfig.ttsProvider === 'bouyomi'
				if (tts) {
					const html = status.content
					const b = stripTagAndLink(html)
					if (isBouyomi) {
						try {
							fetch(`http://localhost:${timelineConfig.ttsPort}/Talk?text=${encodeURIComponent(b)}`)
						} catch {
							console.error('Cannot TTS')
						}
					} else {
						speech(b, timelineConfig)
					}
				}
				const isCh = !ch || (includeTL(ch, timelineKind) && (timelineAdd ? ch.includes(timelineAdd) : true))
				if (isCh) callback({ payload: { status: status, timeline_id: useStreaming[i][0] } as T, kind: ch })
			})
		}
	}
	if (channel === 'receive-timeline-conversation') {
		for (let i = 0; i < useStreaming.length; i++) {
			const streaming = useStreaming[i][1]
			const timelineKind = useStreaming[i][2]
			if (!streaming) continue
			streaming.on('conversation', (status, ch) => {
				if (!ch || includeTL(ch, timelineKind)) callback({ payload: { conversation: status, timeline_id: useStreaming[i][0] } as T, kind: ch })
			})
		}
	}
	if (channel === 'receive-timeline-status-update') {
		for (let i = 0; i < useStreaming.length; i++) {
			const streaming = useStreaming[i][1]
			const timelineKind = useStreaming[i][2]
			const timelineAdd = useStreaming[i][3]
			if (!streaming) continue
			streaming.on('status.update', (status, ch) => {
				const isCh = !ch || (includeTL(ch, timelineKind) && (timelineAdd ? ch.includes(timelineAdd) : true))
				if (isCh) callback({ payload: { status: status, timeline_id: useStreaming[i][0] } as T, kind: ch })
			})
		}
	}
	if (channel === 'delete-timeline-status') {
		for (let i = 0; i < useStreaming.length; i++) {
			const streaming = useStreaming[i][1]
			if (!streaming) continue
			streaming.on('delete', (id) => {
				callback({ payload: { status_id: id, timeline_id: useStreaming[i][0] } as T })
			})
		}
	}
}
export const listenUserWaiter = async (serverId: number) => {
	while ((window.userStreamings || []).findIndex((s: [number, WebSocketInterface, string]) => s[0] === serverId) < 0) {
		console.log('waiting for server listener')
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}
}
export const listenUser = async <T>(channel: string, callback: (a: { payload: T }) => void, timelineConfig: Settings['timeline'], tts: boolean) => {
	// <T>(channel: string, callback: (a: { payload: T }) => void, tts?: boolean) => {}
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
					const b = stripTagAndLink(html)
					if (isBouyomi) {
						try {
							fetch(`http://localhost:${timelineConfig.ttsPort}/Talk?text=${encodeURIComponent(b)}`)
						} catch {
							console.error('Cannot TTS')
						}
					} else {
						speech(b, timelineConfig)
					}
				}
				if (!ch || ch.includes('user')) callback({ payload: { status: status, server_id: userStreamings[i][0] } as T })
			})
		}
	}
	if (channel === 'receive-home-status-update') {
		for (let i = 0; i < userStreamings.length; i++) {
			const streaming = userStreamings[i][1]
			if (!streaming) continue
			streaming.on('status_update', (status, ch) => {
				if (!ch || ch.includes('user')) callback({ payload: { status: status, server_id: userStreamings[i][0] } as T })
			})
		}
	}
	if (channel === 'delete-home-status') {
		for (let i = 0; i < userStreamings.length; i++) {
			const streaming = userStreamings[i][1]
			if (!streaming) continue
			streaming.on('delete', (id) => {
				callback({ payload: { status_id: id, server_id: userStreamings[i][0] } as T })
			})
		}
	}
	if (channel === 'receive-notification') {
		for (let i = 0; i < userStreamings.length; i++) {
			const streaming = userStreamings[i][1]
			if (!streaming) continue
			streaming.on('notification', (mes: any) => {
				callback({ payload: { notification: mes, server_id: userStreamings[i][0] } as T })
			})
		}
	}
}
export const allUnsubscribe = async () => {
	const streamingState = window.userStreamings
	for (const streaming of streamingState) {
		const str: WebSocketInterface = streaming[1]
		if (!str) continue
		const chs = str.channelSubscriptions || []
		for (const ch of chs) {
			if (ch.stream !== 'user') str.unsubscribe(ch.stream)
		}
	}
	if (streamingState.length === 0) return
	for (const streaming of streamingState) streaming[1]?.removeAllListeners()
	window.streamings = []
}
export const allClose = async () => {
	const streamingState = window.streamings || []
	console.log('allClosed', streamingState)
	for (const streaming of streamingState) streaming[1]?.removeAllListeners()
	for (const streaming of streamingState) streaming[1]?.stop()
	window.streamings = []
	const userStreamingState = window.userStreamings || []
	for (const streaming of userStreamingState) streaming[1]?.removeAllListeners()
	for (const streaming of userStreamingState) streaming[1]?.stop()
	window.userStreamings = []

	if (streamingState.length === 0 && userStreamingState.length === 0) return
	await new Promise((resolve) => setTimeout(resolve, 1000))
	return
}
