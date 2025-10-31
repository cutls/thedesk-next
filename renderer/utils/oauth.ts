import generator, { detector, type OAuth } from '@cutls/megalodon'
import type { Account } from '@/entities/account'
import type { Server } from '@/entities/server'
import { open } from './openBrowser'

const misskeyPremission = [
	'read:account',
	'write:account',
	'read:blocks',
	'write:blocks',
	'read:drive',
	'write:drive',
	'read:favorites',
	'write:favorites',
	'read:following',
	'write:following',
	'read:messaging',
	'write:messaging',
	'read:mutes',
	'write:mutes',
	'write:notes',
	'read:notifications',
	'write:notifications',
	'read:reactions',
	'write:reactions',
	'write:votes',
	'read:pages',
	'write:pages',
	'write:page-likes',
	'read:page-likes',
	'read:user-groups',
	'write:user-groups',
	'read:channels',
	'write:channels',
	'read:gallery',
	'write:gallery',
	'read:gallery-likes',
	'write:gallery-likes',
	'read:flash',
	'write:flash',
	'read:flash-likes',
	'write:flash-likes',
	'write:invite-codes',
	'read:invite-codes',
	'write:clip-favorite',
	'read:clip-favorite',
	'read:federation',
	'write:report-abuse'
]
export async function addApplication({ url, redirectUrl }: { url: string; redirectUrl: string }): Promise<OAuth.AppData> {
	const sns = await detector(url)
	if (sns === 'gotosocial') return
	const client = generator(sns, url)
	const isMisskey = sns === 'misskey'
	const scopes = isMisskey ? misskeyPremission : ['read', 'write', 'follow']
	const app = await client.registerApp('TheDesk(Desktop)', { scopes, redirect_uris: !isMisskey ? redirectUrl : 'urn:ietf:wg:oauth:2.0:oob', website: 'https://thedesk.top' })
	open(app.url)
	return app
}
export async function authorizeCode({ server, app, code }: { server: Server; app: OAuth.AppData; code: string }): Promise<void> {
	const client = generator(server.sns, server.base_url)
	const token = await client.fetchAccessToken(app.client_id, app.client_secret, code || app.session_token, app.redirect_uri)
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
		usual: false
	}
	accounts.push(account)
	localStorage.setItem('accounts', JSON.stringify(accounts))
	const serversStr = localStorage.getItem('servers')
	const servers: Array<Server> = JSON.parse(serversStr || '[]')
	const serverIndex = servers.findIndex((s) => s.base_url === server.base_url)
	const newServer = servers.map((s, i) => (i === serverIndex ? { ...s, account_id: id } : s))
	localStorage.setItem('servers', JSON.stringify(newServer))
}
export const updateAvatar = async (isStatic: boolean) => {
	const serverStr = localStorage.getItem('servers')
	if (!serverStr) return
	const servers: Array<Server> = JSON.parse(serverStr)
	const accountsStr = localStorage.getItem('accounts')
	if (!accountsStr) return
	const accounts: Array<Account> = JSON.parse(accountsStr)
	for (const server of servers) {
		const account = accounts.find((a) => a.id === server.account_id)
		if (!account) continue
		const client = generator(server.sns, server.base_url, account.access_token)
		try {
			const { data: accountData } = await client.verifyAccountCredentials()
			if (account.avatar !== accountData.avatar) {
				account.avatar = isStatic ? accountData.avatar_static : accountData.avatar
			}
		} catch (e) {
			console.error(e)
		}
	}
	localStorage.setItem('accounts', JSON.stringify(accounts))
}
