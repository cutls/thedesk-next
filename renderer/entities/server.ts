import type { Account } from './account'

export type Server = {
	id: number
	domain: string
	base_url: string
	sns: 'mastodon' | 'pleroma' | 'friendica' | 'firefish' | 'misskey'
	favicon: string | null
	account_id: number | null
	no_streaming?: boolean
	cannot_subscribe?: boolean
}

export type ServerSet = {
	server: Server
	account: Account | null
}
