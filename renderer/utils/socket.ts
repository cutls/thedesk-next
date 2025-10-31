import type { Timeline } from '@/entities/timeline'
import generator, { detector, type WebSocketInterface } from '@cutls/megalodon'
import { listServers, getAccount } from './storage'
import type { Server } from '@/entities/server'
import type { Settings } from '@/entities/settings'
import { Account } from '@/entities/account'

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
export const start = async (timelines: Array<[Timeline, Server, Account]>, generateStreaming: boolean) => {
	const fn = async () => {
		const userStreamings: StreamingArray[] = !generateStreaming ? window.userStreamings : []
		if (generateStreaming) {
			const servers = await listServers()
			for (const [server, account] of servers) {
				const noStreaming = server.no_streaming
				try {
					const sns = await detector(server.base_url)
					const client = generator(sns, server.base_url, account?.access_token)
					const streaming = (!noStreaming) ? await client.userStreamingSubscription() : undefined
					userStreamings.push([server.id, streaming, 'home'])
				} catch (e) {
					console.error(e)
					console.error('skipped user streaming')
				}
			}
		}

		const streamings: StreamingArray[] = []
		let i = 0
		for (const [timeline, server] of timelines) {
			if (!server) continue

			let streaming: StreamingArray
			try {
				const accountId = server.account_id
				const [account] = accountId ? await getAccount({ id: accountId }) : [null]
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
				if (!ch || ch.includes(timelineKind)) callback({ payload: { status: status, timeline_id: useStreaming[i][0] } as T, kind: ch })
			})
		}
	}
	if (channel === 'receive-timeline-conversation') {
		for (let i = 0; i < useStreaming.length; i++) {
			const streaming = useStreaming[i][1]
			const timelineKind = useStreaming[i][2]
			if (!streaming) continue
			streaming.on('conversation', (status, ch) => {
				if (!ch || ch.includes(timelineKind)) callback({ payload: { conversation: status, timeline_id: useStreaming[i][0] } as T, kind: ch })
			})
		}
	}
	if (channel === 'receive-timeline-status-update') {
		for (let i = 0; i < useStreaming.length; i++) {
			const streaming = useStreaming[i][1]
			const timelineKind = useStreaming[i][2]
			if (!streaming) continue
			streaming.on('status.update', (status, ch) => {
				if (!ch || ch.includes(timelineKind)) callback({ payload: { status: status, timeline_id: useStreaming[i][0] } as T, kind: ch })
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
			streaming.on('notification', (mes, ch) => {
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
}
export const allClose = async () => {
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
