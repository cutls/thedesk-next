import type { Account } from '@/entities/account'
import type { Server } from '@/entities/server'
import { type Settings, defaultSetting } from '@/entities/settings'
import { type AddTimeline, type Color, type Timeline, colorList } from '@/entities/timeline'
import { localTypeList } from '@/i18n'
import { detector } from '@cutls/megalodon'

export async function listTimelines(): Promise<[Timeline, Server][][]> {
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const serversStr = localStorage.getItem('servers')
	const servers: Server[] = JSON.parse(serversStr || '[]')
	return timelines.map((oneColumn) => oneColumn.map((timeline) => [timeline, servers.find((server) => server.id === timeline.server_id)]))
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
	timelines.push([{
		id: flatTls.length + 1,
		kind: timeline.kind,
		name: timeline.name,
		sort: flatTls.length + 1,
		server_id: server.id,
		list_id: timeline.listId || null,
		column_width: timeline.columnWidth,
	}])
	localStorage.setItem('timelinesV2', JSON.stringify(timelines))
	return
}
async function removeTimelineCore(timelines: Timeline[][], id: number): Promise<Timeline[][]> {
	const newTimelines = timelines.map((timeline) => timeline.filter((tl) => tl.id !== id))
	return reorderTimelineCore(newTimelines)
}
async function reorderTimelineCore(timelines: Timeline[][]): Promise<Timeline[][]> {
	const newOrderTimelines: Timeline[][] = []
	let newId = 0
	for (const tls of timelines) {
		const subTl: Timeline[] = []
		for (const tl of tls) {
			newId = newId + 1
			subTl.push({ ...tl, id: newId })
		}
		if (subTl.length > 0) newOrderTimelines.push(subTl)
	}
	return newOrderTimelines
}
export async function removeTimeline({ id }: { id: number }): Promise<void> {
	const timelinesStr = localStorage.getItem('timelinesV2')
	const timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const newOrderTimelines = await removeTimelineCore(timelines, id)
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
	if (sns === 'gotosocial') return
	const server = {
		id: serverMaxId + 1,
		domain: domain,
		base_url: `https://${domain}`,
		sns,
		favicon: null,
		account_id: null,
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
	let timelines: Timeline[][] = JSON.parse(timelinesStr || '[]')
	const flatTls = timelines.flat()
	const newFlatTimelineIds = flatTls.filter((timeline) => timeline.server_id !== id).map((tl) => tl.id)
	for (const removeId of newFlatTimelineIds) {
		timelines = await removeTimelineCore(timelines, removeId)
	}
	localStorage.setItem('timelinesV2', JSON.stringify(timelines))
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
	return
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
	const timelineIndex = timelines.findIndex((timeline) => timeline[0].id === id)
	const nextIndex = direction === 'left' ? timelineIndex - 1 : timelineIndex + 1
	if (nextIndex < 0 || nextIndex >= timelines.length) return
	const tmp = structuredClone(timelines[nextIndex])
	timelines[nextIndex] = timelines[timelineIndex]
	timelines[timelineIndex] = tmp
	const newTimelines = reorderTimelineCore(timelines)
	localStorage.setItem('timelinesV2', JSON.stringify(newTimelines))
	return
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
