import { detector } from '@cutls/megalodon'
import type { Account } from '@/entities/account'
import type { Server } from '@/entities/server'
import { defaultSetting, type Settings } from '@/entities/settings'
import { type AddTimeline, type Color, colorList, columnWidth as columnWidthCalc, type Timeline } from '@/entities/timeline'
import { localTypeList } from '@/i18n'
export function migrateTimelineV1toV2() {
	const timelinesV2Str = localStorage.getItem('timelinesV2')
	if (!timelinesV2Str) {
		const timelinesStr = localStorage.getItem('timelines')
		const timeline: Timeline[] = JSON.parse(timelinesStr || '[]')
		localStorage.removeItem('timelines')
		const newTimeline = timeline.map((tl) => [tl])
		localStorage.setItem('timelinesV2', JSON.stringify(newTimeline))
	}
}
export async function listTimelines(): Promise<[Timeline, Server, Account | null][][]> {
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const serversStr = localStorage.getItem('servers')
	const servers: Server[] = JSON.parse(serversStr || '[]')
	const accountsStr = localStorage.getItem('accounts')
	const accounts: Account[] = JSON.parse(accountsStr || '[]')
	return timelines
		.map((oneColumn) =>
			oneColumn
				.map((timeline) => {
					const server = servers.find((server) => server.id === timeline.server_id)
					return [timeline, server, (accounts.find((acct) => acct.id === server?.account_id) || null)]
				})
				.filter((pair) => pair[1] !== undefined)
		)
		.filter((d) => d.length) as [Timeline, Server, Account | null][][]
}

export async function listAccounts(): Promise<[Account, Server][]> {
	const accountsStr = localStorage.getItem('accounts')
	const accounts: Account[] = JSON.parse(accountsStr || '[]')
	const serversStr = localStorage.getItem('servers')
	const servers: Server[] = JSON.parse(serversStr || '[]')
	const accountFiltered = accounts.filter((account) => servers.findIndex((server) => server.account_id === account.id) >= 0)
	localStorage.setItem('accounts', JSON.stringify(accountFiltered))
	return accountFiltered.map((account) => [account, servers.find((server) => server.account_id === account.id)])
}

export async function addTimeline(server: Server, timeline: AddTimeline): Promise<void> {
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const flatTls = timelines.flat()
	timelines.push([
		{
			id: flatTls.length + 1,
			kind: timeline.kind,
			name: timeline.name,
			sort: flatTls.length + 1,
			server_id: server.id,
			list_id: timeline.listId || null,
			column_width: timeline.columnWidth
		}
	])
	localStorage.setItem('timelinesV2', JSON.stringify(timelines))
	return
}
async function removeTimelineCore(timelines: Timeline[][], ids: number[]): Promise<Timeline[][]> {
	const newTimelines = timelines.map((timeline) => timeline.filter((tl) => !ids.includes(tl.id))).filter((tls) => tls.length > 0)
	const ret = await reorderTimelineCore(newTimelines)
	console.log(`delete ${ids.join()}`, newTimelines, ret)
	return ret
}
async function reorderTimelineCore(timelines: Timeline[][]): Promise<Timeline[][]> {
	const newOrderTimelines: Timeline[][] = []
	let newId = 0
	for (const tls of timelines) {
		const subTl: Timeline[] = []
		let stackChecker = 0
		for (const tl of tls) {
			newId = newId + 1
			subTl.push({ ...tl, id: newId, stacked: stackChecker > 0 })
			stackChecker = stackChecker + 1
		}
		if (subTl.length > 0) newOrderTimelines.push(subTl)
	}
	return newOrderTimelines
}
export async function removeTimeline({ id }: { id: number }): Promise<void> {
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const newOrderTimelines = await removeTimelineCore(timelines, [id])
	localStorage.setItem('timelinesV2', JSON.stringify(newOrderTimelines))
	return
}

export async function listServers(): Promise<[Server, Account][]> {
	const serversStr = localStorage.getItem('servers')
	const servers: Server[] = JSON.parse(serversStr || '[]')
	const accountsStr = localStorage.getItem('accounts')
	const accounts: Account[] = JSON.parse(accountsStr || '[]')
	return servers.map((server) => [server, accounts.find((account) => server.account_id === account.id)])
}

export async function addServer({ domain }: { domain: string }): Promise<Server> {
	const serversStr = localStorage.getItem('servers')
	const servers: Server[] = JSON.parse(serversStr || '[]')
	const serverMaxId = servers.reduce((max, server) => (server.id > max ? server.id : max), 0)
	const sns = await detector(`https://${domain}`)
	if (sns === 'gotosocial' || sns === 'pixelfed') return
	const noStreaming = sns === 'friendica'
	const noSubscribe = sns === 'pleroma' || sns === 'firefish'
	const server = {
		id: serverMaxId + 1,
		domain: domain,
		base_url: `https://${domain}`,
		sns,
		favicon: null,
		account_id: null,
		no_streaming: noStreaming,
		cannot_subscribe: noSubscribe
	}
	servers.push(server)
	localStorage.setItem('servers', JSON.stringify(servers))
	return server
}
export async function getServer({ id }: { id: number }): Promise<Server> {
	const serversStr = localStorage.getItem('servers')
	const servers: Server[] = JSON.parse(serversStr || '[]')
	const server = servers.find((server) => server.id === id)
	return server
}
export async function removeServer({ id }: { id: number }): Promise<void> {
	const serverStr = localStorage.getItem('servers')
	const servers: Server[] = JSON.parse(serverStr || '[]')
	const targetServer = servers.find((server) => server.id === id)
	const deleteAccount = targetServer ? targetServer.account_id : null
	if (deleteAccount) {
		const accountsStr = localStorage.getItem('accounts')
		const accounts: Account[] = JSON.parse(accountsStr || '[]')
		const newAccounts = accounts.filter((account) => account.id !== deleteAccount)
		localStorage.setItem('accounts', JSON.stringify(newAccounts))
	}
	const newServers = servers.filter((server) => server.id !== id)
	localStorage.setItem('servers', JSON.stringify(newServers))
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const flatTls = timelines.flat()
	const deleteFlatTimelineIds = flatTls.filter((timeline) => timeline.server_id === id).map((tl) => tl.id)
	const newTimelines = await removeTimelineCore(timelines, deleteFlatTimelineIds)
	localStorage.setItem('timelinesV2', JSON.stringify(newTimelines))
	return
}

const getLang = (value: string) => {
	if (!value) return 'en'
	const values = value.split('-')
	for (const lang of localTypeList) {
		const langs = lang.split('-')
		if (langs.length === 1) {
			if (values[0] === lang) return lang
		} else {
			if (value === lang) return lang
		}
	}
}
export async function readSettings(lang?: string): Promise<Settings> {
	if (lang) localStorage.setItem('lang', lang)
	const settingsStr = localStorage.getItem('settings')
	const langUse = lang || localStorage.getItem('lang')
	const langTyped = getLang(langUse)
	if (!settingsStr) {
		defaultSetting.appearance.language = langTyped
		return defaultSetting
	}
	const settings: Settings = JSON.parse(settingsStr)
	return settings
}
export async function saveSetting({ obj }: { obj: Settings }): Promise<void> {
	localStorage.setItem('settings', JSON.stringify(obj))
	return
}
export async function getAccount({ id }: { id: number }): Promise<[Account, Server]> {
	const serversStr = localStorage.getItem('servers')
	const servers: Server[] = JSON.parse(serversStr || '[]')
	const server = servers.find((server) => server.account_id === id)
	const accountsStr = localStorage.getItem('accounts')
	const accounts: Account[] = JSON.parse(accountsStr || '[]')
	const account = accounts.find((account) => account.id === id)
	return [account, server]
}
export async function setUsualAccount({ id }: { id: number }): Promise<void> {
	localStorage.setItem('usualAccount', id.toString())
	return
}
export async function getUsualAccount(): Promise<number> {
	localStorage.getItem('usualAccount')
	return Number.parseInt(localStorage.getItem('usualAccount') || '0')
}
async function updateColumnSettingCore(timelines: Timeline[][], id: number, key: keyof Timeline, value: any) {
	const newTimelines: Timeline[][] = []
	for (const tls of timelines) {
		const subTls: Timeline[] = []
		for (const tl of tls) {
			if (tl.id === id) {
				subTls.push({ ...tl, [key]: value })
			} else {
				subTls.push(tl)
			}
		}
		newTimelines.push(subTls)
	}
	return newTimelines
}
export async function updateColumnWidth({ id, columnWidth }: { id: number; columnWidth: number }) {
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const newTimelines = await updateColumnSettingCore(timelines, id, 'column_width', columnWidth)
	localStorage.setItem('timelinesV2', JSON.stringify(newTimelines))
	return newTimelines.map((timeline) => columnWidthCalc(timeline[0].column_width))
}
export async function updateColumnHeight({ id, columnHeight }: { id: number; columnHeight: number }) {
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const newTimelines = await updateColumnSettingCore(timelines, id, 'column_height', columnHeight)
	localStorage.setItem('timelinesV2', JSON.stringify(newTimelines))
}
const isColorGuard = (value: string): value is Color => colorList.includes(value as any)
export async function updateColumnColor({ id, color }: { id: number; color: string }) {
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const useColor = isColorGuard(color) ? color : undefined
	const newTimelines = await updateColumnSettingCore(timelines, id, 'color', useColor)
	localStorage.setItem('timelinesV2', JSON.stringify(newTimelines))
	return
}
export async function updateColumnOrder({ id, direction }: { id: number; direction: 'left' | 'right' }) {
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const timelineIndex = timelines.findIndex((timeline) => timeline.findIndex((t) => t.id === id) >= 0)
	console.log(timelineIndex)
	const nextIndex = direction === 'left' ? timelineIndex - 1 : timelineIndex + 1
	if (nextIndex < 0 || nextIndex >= timelines.length) return
	const tmp = structuredClone(timelines[nextIndex])
	timelines[nextIndex] = timelines[timelineIndex]
	timelines[timelineIndex] = tmp
	console.log(timelines)
	const newTimelines = await reorderTimelineCore(timelines)
	console.log(newTimelines)
	localStorage.setItem('timelinesV2', JSON.stringify(newTimelines))
	return
}
export async function updateColumnStack({ id, stack }: { id: number; stack: boolean }) {
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const wrapperIndex = timelines.findIndex((timeline) => timeline.findIndex((t) => t.id === id) >= 0)
	const target = timelines[wrapperIndex].find((t) => t.id === id)
	if (wrapperIndex < 0) return false
	if (stack) {
		if (wrapperIndex === 0) return false
		const columnTo: Timeline[] = [...timelines[wrapperIndex - 1], target]
		const columnFrom: Timeline[] = timelines[wrapperIndex].filter((t) => t.id !== id)
		timelines[wrapperIndex - 1] = columnTo
		timelines[wrapperIndex] = columnFrom
		const orderedTimelines = await reorderTimelineCore(timelines)
		localStorage.setItem('timelinesV2', JSON.stringify(orderedTimelines))
	} else {
		const columnFrom: Timeline[] = timelines[wrapperIndex].filter((t) => t.id !== id).map((t) => ({ ...t, column_height: undefined }))
		const isLast = wrapperIndex === timelines.length - 1
		const editedTL = isLast ? [...timelines, [target]] : timelines.splice(wrapperIndex + 1, 0, [target])
		const splicedTimelines = isLast ? editedTL : timelines
		splicedTimelines[wrapperIndex] = columnFrom
		const orderedTimelines = await reorderTimelineCore(splicedTimelines)
		localStorage.setItem('timelinesV2', JSON.stringify(orderedTimelines))
	}
	return true
}
export async function updateAccountColor({ id, color }: { id: number; color: string }) {
	const accountsStr = localStorage.getItem('accounts')
	const accounts: Account[] = JSON.parse(accountsStr || '[]')
	const account = accounts.find((account) => account.id === id)
	if (!account) return
	if (!isColorGuard(color)) {
		account.color = undefined
	} else {
		account.color = color
	}
	console.log(accounts)
	localStorage.setItem('accounts', JSON.stringify(accounts))
	return
}
export async function updateColumnTts({ id, toggle }: { id: number; toggle: boolean }) {
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const newTimelines = await updateColumnSettingCore(timelines, id, 'tts', toggle)
	localStorage.setItem('timelinesV2', JSON.stringify(newTimelines))
	return
}
export async function updateColumnMediaOnly({ id, toggle }: { id: number; toggle: boolean }) {
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const newTimelines = await updateColumnSettingCore(timelines, id, 'mediaOnly', toggle)
	localStorage.setItem('timelinesV2', JSON.stringify(newTimelines))
	return
}
