import { Account } from "@/entities/account";
import { Server } from "@/entities/server";
import { Settings, defaultSetting } from "@/entities/settings";
import { AddTimeline, Timeline } from "@/entities/timeline";
import { detector } from 'megalodon'

export async function listTimelines(): Promise<Array<[Timeline, Server]>> {
    const timelinesStr = localStorage.getItem('timelines')
    const timelines: Array<Timeline> = JSON.parse(timelinesStr || '[]')
    const serversStr = localStorage.getItem('servers')
    const servers: Array<Server> = JSON.parse(serversStr || '[]')
    return timelines.map((timeline) => [timeline, servers.find((server) => server.id === timeline.server_id)])
}

export async function listAccounts(): Promise<Array<[Account, Server]>> {
    const accountsStr = localStorage.getItem('accounts')
    const accounts: Array<Account> = JSON.parse(accountsStr || '[]')
    const serversStr = localStorage.getItem('servers')
    const servers: Array<Server> = JSON.parse(serversStr || '[]')
    return accounts.map((account) => [account, servers.find((server) => server.account_id === account.id)])
}

export async function addTimeline(server: Server, timeline: AddTimeline): Promise<void> {
    const timelinesStr = localStorage.getItem('timelines')
    const timelines: Array<Timeline> = JSON.parse(timelinesStr || '[]')
    timelines.push({
        id: timelines.length + 1,
        kind: timeline.kind,
        name: timeline.name,
        sort: timelines.length + 1,
        server_id: server.id,
        list_id: timeline.listId || null,
        column_width: timeline.columnWidth
    })
    localStorage.setItem('timelines', JSON.stringify(timelines))
    return
}



export async function removeTimeline({ id }: { id: number }): Promise<void> {
    const timelinesStr = localStorage.getItem('timelines')
    const timelines: Array<Timeline> = JSON.parse(timelinesStr || '[]')
    const newTimelines = timelines.filter((timeline) => timeline.id !== id)
    localStorage.setItem('timelines', JSON.stringify(newTimelines))
    return
}

export async function listServers(): Promise<Array<[Server, Account]>> {
    const serversStr = localStorage.getItem('servers')
    const servers: Array<Server> = JSON.parse(serversStr || '[]')
    const accountsStr = localStorage.getItem('accounts')
    const accounts: Array<Account> = JSON.parse(accountsStr || '[]')
    return servers.map((server) => [server, accounts.find((account) => server.account_id === account.id)])
}

export async function addServer({ domain }: { domain: string }): Promise<Server> {
    const serversStr = localStorage.getItem('servers')
    const servers: Array<Server> = JSON.parse(serversStr || '[]')
    const sns =  await detector(`https://${domain}`)
    if (sns === 'gotosocial') return
    const server = {
        id: servers.length + 1,
        domain: domain,
        base_url: `https://${domain}`,
        sns,
        favicon: null,
        account_id: null
    }
    servers.push(server)
    localStorage.setItem('servers', JSON.stringify(servers))
    return server
}
export async function getServer({ id }: { id: number }): Promise<Server> {
    const serversStr = localStorage.getItem('servers')
    const servers: Array<Server> = JSON.parse(serversStr || '[]')
    const server = servers.find((server) => server.id === id)
    return server
}
export async function removeServer({ id }: { id: number }): Promise<void> {
    const serverStr = localStorage.getItem('servers')
    const servers: Array<Server> = JSON.parse(serverStr || '[]')
    const newServers = servers.filter((server) => server.id !== id)
    localStorage.setItem('servers', JSON.stringify(newServers))
    return
}
export async function readSettings(): Promise<Settings> {
    const settingsStr = localStorage.getItem('settings')
    if (!settingsStr) return defaultSetting
    const settings: Settings = JSON.parse(settingsStr)
    return settings
}
export async function saveSetting({ obj }: { obj: Settings }): Promise<void> {
    localStorage.setItem('settings', JSON.stringify(obj))
    return
}
export async function getAccount({ id }: { id: number }): Promise<[Account, Server]> {
    const serversStr = localStorage.getItem('servers')
    const servers: Array<Server> = JSON.parse(serversStr || '[]')
    const server = servers.find((server) => server.account_id === id)
    const accountsStr = localStorage.getItem('accounts')
    const accounts: Array<Account> = JSON.parse(accountsStr || '[]')
    const account = accounts.find((account) => account.id === id)
    return [account, server]
}
export async function setUsualAccount({ id }: { id: number }): Promise<void> {
    localStorage.setItem('usualAccount', id.toString())
    return
}
export async function getUsualAccount(): Promise<number> {
    localStorage.getItem('usualAccount')
    return parseInt(localStorage.getItem('usualAccount') || '0')
}
