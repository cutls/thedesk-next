import type { Account } from '@/entities/account'
import type { Server } from '@/entities/server'
import generator, { type OAuth, detector } from 'megalodon'
import { open } from './openBrowser'

export async function addApplication({ url, redirectUrl }: { url: string, redirectUrl: string }): Promise<OAuth.AppData> {
	const sns = await detector(url)
	if (sns === 'gotosocial') return
	const client = generator(sns, url)
	const app = await client.registerApp('TheDesk(Desktop)', { scopes: ['read', 'write', 'follow'], redirect_uris: redirectUrl, website: 'https://thedesk.top' })
	open(app.url)
	return app
}
export async function authorizeCode({ server, app, code }: { server: Server; app: OAuth.AppData; code: string }): Promise<void> {
	const client = generator(server.sns, server.base_url)
	const token = await client.fetchAccessToken(app.client_id, app.client_secret, code, app.redirect_uri)
	const authrizedClient = generator(server.sns, server.base_url, token.access_token)
	const { data: accountData } = await authrizedClient.verifyAccountCredentials()
	const accountsStr = localStorage.getItem('accounts')
	const accounts: Array<Account> = JSON.parse(accountsStr || '[]')
	const id = accounts.length + 1
	const account: Account = {
		id,
		username: accountData.username,
		account_id: accountData.id,
		avatar: accountData.avatar,
		client_id: app.client_id,
		client_secret: app.client_secret,
		access_token: token.access_token,
		refresh_token: token.refresh_token,
		usual: false,
	}
	accounts.push(account)
	localStorage.setItem('accounts', JSON.stringify(accounts))
	const serversStr = localStorage.getItem('servers')
	const servers: Array<Server> = JSON.parse(serversStr || '[]')
	const serverIndex = servers.findIndex((s) => s.base_url === server.base_url)
	const newServer = servers.map((s, i) => (i === serverIndex ? { ...s, account_id: id } : s))
	localStorage.setItem('servers', JSON.stringify(newServer))
}
