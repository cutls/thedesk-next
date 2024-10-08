import { open } from '@/utils/openBrowser'
const apiGateway = 'https://ep9jquu2w4.execute-api.ap-northeast-1.amazonaws.com/thedesk/spotify'
async function spotifyApi(url: string, showToaster: (message: string) => void) {
	const token = localStorage.getItem('spotifyV2Token')
	if (!token) nowplayingInit(false, showToaster)
	const expires = localStorage.getItem('spotifyV2Expires') || `${new Date().getTime()}`
	const isExpired = new Date().getTime() / 1000 > Number.parseInt(expires, 10)
	const at = isExpired ? await refreshSpotifyToken() : localStorage.getItem('spotifyV2Token')
	if (!at) return showToaster('compose.nowplaying.error')
	if (at) {
		const jsonRaw = await fetch(url, {
			method: 'get',
			headers: {
				'content-type': 'application/json',
				Authorization: `Bearer ${at}`,
			},
		})
		if (jsonRaw.status === 204) return
		return jsonRaw.json()
	}
}
export function spotifyTemplateReplace(item: any, template: string) {
	let content = template === 'null' || !template ? '#NowPlaying {song} / {album} / {artist}\n{url} #SpotifyWithTheDesk' : template
	const regExp1 = /{song}/g
	content = content.replace(regExp1, item.name)
	const regExp2 = /{album}/g
	content = content.replace(regExp2, item.album.name)
	const regExp3 = /{artist}/g
	content = content.replace(regExp3, item.artists[0].name)
	const regExp4 = /{url}/g
	content = content.replace(regExp4, item.external_urls.spotify)
	const regExp5 = /{composer}/g
	content = content.replace(regExp5, '')
	const regExp6 = /{hz}/g
	content = content.replace(regExp6, '')
	const regExp7 = /{bitRate}/g
	content = content.replace(regExp7, '')
	const regExp8 = /{lyricist}/g
	content = content.replace(regExp8, '')
	const regExp9 = /{bpm}/g
	content = content.replace(regExp9, '')
	const regExp0 = /{genre}/g
	content = content.replace(regExp0, '')
	return content
}
export async function nowplaying(key: 'spotify' | 'appleMusic', showToaster: (message: string) => void) {
	if (key === 'spotify') {
		const start = 'https://api.spotify.com/v1/me/player/currently-playing'
		try {
			const json = await spotifyApi(start, showToaster)
			const item = json.item
			const img = item.album.images[0].url
			const file = new File([await (await fetch(img)).blob()], 'cover.jpg', { type: 'image/jpeg' })
			const contentRaw = localStorage.getItem('spotifyTemplate')
			const content = spotifyTemplateReplace(item, contentRaw)
			return { text: content, file, title: `${item.name} ${item.album.name} ${item.artists[0].name}` }
		} catch (e: any) {
			await refreshSpotifyToken()
			showToaster('compose.nowplaying.error')
			return null
		}
	} else if (key === 'appleMusic') {
		console.log('request')
		window.electronAPI.requestAppleMusic()
		type IFile = { text: string; file: File; title: string }
		const data: IFile = await new Promise((resolve) =>
			window.electronAPI.appleMusic(async (_, item) => {
				console.log(item)
				const contentRaw = localStorage.getItem('nowplayingTemplate')
				const artwork = item.artwork ? new File([Buffer.from(item.artwork, 'base64')], 'cover.png', { type: 'image/png' }) : null
				let content = contentRaw === 'null' || !contentRaw ? '#NowPlaying {song} / {album} / {artist}\n{url} #SpotifyWithTheDesk' : contentRaw
				const regExp1 = /{song}/g
				content = content.replace(regExp1, item.name)
				const regExp2 = /{album}/g
				content = content.replace(regExp2, item.album)
				const regExp3 = /{artist}/g
				content = content.replace(regExp3, item.artist)
				const regExp4 = /{url}/g
				content = content.replace(regExp4, '')
				const regExp5 = /{composer}/g
				content = content.replace(regExp5, item.composer)
				const regExp6 = /{hz}/g
				content = content.replace(regExp6, item.sampleRate)
				const regExp7 = /{bitRate}/g
				content = content.replace(regExp7, '')
				const regExp8 = /{lyricist}/g
				content = content.replace(regExp8, '')
				const regExp9 = /{bpm}/g
				content = content.replace(regExp9, '')
				const regExp0 = /{genre}/g
				content = content.replace(regExp0, '')
				resolve({ text: content, file: artwork, title: `${item.name} ${item.album} ${item.artist}` })
			}),
		)
		console.log(data)
		return data
	}
}
async function refreshSpotifyToken() {
	const refreshToken = localStorage.getItem('spotifyV2Refresh')
	const start = `${apiGateway}?state=refresh&refreshToken=${refreshToken}`
	try {
		const api = await fetch(start, {
			method: 'get',
			headers: {
				'content-type': 'application/json',
			},
		})
		const json = await api.json()
		const { accessToken, refreshToken: _newRT } = json
		if (!accessToken) throw new Error('No access token')
		localStorage.setItem('spotifyV2Token', accessToken)
		localStorage.setItem('spotifyV2Expires', `${new Date().getTime() / 1000 + 3600}`)
		return accessToken
	} catch (e: any) {}
}
export async function getUnknownAA(q: string, country: string) {
	const start = `https://itunes.apple.com/search?term=${q}&country=${country}&entity=song`
	const promise = await fetch(start, {
		method: 'GET',
	})
	const json = await promise.json()
	if (!json.resultCount) {
		return null
	}
	const data = json.results[0].artworkUrl100
	const file = new File([await (await fetch(data.replace(/100x100/, '512x512'))).blob()], 'cover.jpg', { type: 'image/jpeg' })
	return file
}
export async function nowplayingInit(isDev: boolean, showToaster: (m: string) => void) {
	if (!isDev) open(`${apiGateway}?state=connect`)
	if (isDev) open(`${apiGateway}?state=connectDev2`)

	window.electronAPI.customUrl(async (_, data) => {
		if (data[0] === 'spotifyv2') {
			const code = data[1]
			nowplayingCode(code, showToaster)
		}
	})
}
export async function nowplayingCode(code: string, showToaster: (m: string) => void) {
	const api = await fetch(`${apiGateway}?state=auth&code=${code.replace(/\n/g, '')}`, {
		headers: {
			'content-type': 'application/json',
		},
	})
	const json = await api.json()
	const { accessToken, refreshToken } = json
	localStorage.setItem('spotifyV2Token', accessToken)
	localStorage.setItem('spotifyV2Refresh', refreshToken)
	localStorage.setItem('spotifyV2Expires', `${new Date().getTime() / 1000 + 3600}`)
	showToaster('compose.nowplaying.again')
}

export function nowplayingDisconnect() {
	localStorage.removeItem('spotifyV2Token')
	localStorage.removeItem('spotifyV2Refresh')
	localStorage.removeItem('spotifyV2Expires')
}
const jaPlaylist = '37i9dQZEVXbKXQ4mDTEBXq'
const enPlaylist = '5FN6Ego7eLX6zHuCMovIR2'
// biome-ignore lint/complexity/useLiteralKeys: <explanation>
const mockTrackItem = {
	album: {
		album_type: 'compilation',
		artists: [
			{
				external_urls: { spotify: 'https://open.spotify.com/artist/3WrFJ7ztbogyGnTHbHJFl2' },
				href: 'https://api.spotify.com/v1/artists/3WrFJ7ztbogyGnTHbHJFl2',
				id: '3WrFJ7ztbogyGnTHbHJFl2',
				name: 'The Beatles',
				type: 'artist',
				uri: 'spotify:artist:3WrFJ7ztbogyGnTHbHJFl2',
			},
		],
		available_markets: [
			'AR',
			'AU',
			'AT',
			'BE',
			'BO',
			'BR',
			'BG',
			'CA',
			'CL',
			'CO',
			'CR',
			'CY',
			'CZ',
			'DK',
			'DO',
			'DE',
			'EC',
			'EE',
			'SV',
			'FI',
			'FR',
			'GR',
			'GT',
			'HN',
			'HK',
			'HU',
			'IS',
			'IE',
			'IT',
			'LV',
			'LT',
			'LU',
			'MY',
			'MT',
			'MX',
			'NL',
			'NZ',
			'NI',
			'NO',
			'PA',
			'PY',
			'PE',
			'PH',
			'PL',
			'PT',
			'SG',
			'SK',
			'ES',
			'SE',
			'CH',
			'TW',
			'TR',
			'UY',
			'US',
			'GB',
			'AD',
			'LI',
			'MC',
			'ID',
			'JP',
			'TH',
			'VN',
			'RO',
			'IL',
			'ZA',
			'SA',
			'AE',
			'BH',
			'QA',
			'OM',
			'KW',
			'EG',
			'MA',
			'DZ',
			'TN',
			'LB',
			'JO',
			'PS',
			'IN',
			'BY',
			'KZ',
			'MD',
			'UA',
			'AL',
			'BA',
			'HR',
			'ME',
			'MK',
			'RS',
			'SI',
			'KR',
			'BD',
			'PK',
			'LK',
			'GH',
			'KE',
			'NG',
			'TZ',
			'UG',
			'AG',
			'AM',
			'BS',
			'BB',
			'BZ',
			'BT',
			'BW',
			'BF',
			'CV',
			'CW',
			'DM',
			'FJ',
			'GM',
			'GE',
			'GD',
			'GW',
			'GY',
			'HT',
			'JM',
			'KI',
			'LS',
			'LR',
			'MW',
			'MV',
			'ML',
			'MH',
			'FM',
			'NA',
			'NR',
			'NE',
			'PW',
			'PG',
			'WS',
			'SM',
			'ST',
			'SN',
			'SC',
			'SL',
			'SB',
			'KN',
			'LC',
			'VC',
			'SR',
			'TL',
			'TO',
			'TT',
			'TV',
			'VU',
			'AZ',
			'BN',
			'BI',
			'KH',
			'CM',
			'TD',
			'KM',
			'GQ',
			'SZ',
			'GA',
			'GN',
			'KG',
			'LA',
			'MO',
			'MR',
			'MN',
			'NP',
			'RW',
			'TG',
			'UZ',
			'ZW',
			'BJ',
			'MG',
			'MU',
			'MZ',
			'AO',
			'CI',
			'DJ',
			'ZM',
			'CD',
			'CG',
			'IQ',
			'LY',
			'TJ',
			'VE',
			'ET',
			'XK',
		],
		external_urls: { spotify: 'https://open.spotify.com/album/1cTeNkeINtXiaMLlashAKs' },
		href: 'https://api.spotify.com/v1/albums/1cTeNkeINtXiaMLlashAKs',
		id: '1cTeNkeINtXiaMLlashAKs',
		images: [
			{ height: 640, url: 'https://i.scdn.co/image/ab67616d0000b2736e3d3c964df32136fb1cd594', width: 640 },
			{ height: 300, url: 'https://i.scdn.co/image/ab67616d00001e026e3d3c964df32136fb1cd594', width: 300 },
			{ height: 64, url: 'https://i.scdn.co/image/ab67616d000048516e3d3c964df32136fb1cd594', width: 64 },
		],
		name: 'The Beatles 1967 - 1970 (Remastered)',
		release_date: '1973-04-02',
		release_date_precision: 'day',
		total_tracks: 28,
		type: 'album',
		uri: 'spotify:album:1cTeNkeINtXiaMLlashAKs',
	},
	artists: [
		{
			external_urls: { spotify: 'https://open.spotify.com/artist/3WrFJ7ztbogyGnTHbHJFl2' },
			href: 'https://api.spotify.com/v1/artists/3WrFJ7ztbogyGnTHbHJFl2',
			id: '3WrFJ7ztbogyGnTHbHJFl2',
			name: 'The Beatles',
			type: 'artist',
			uri: 'spotify:artist:3WrFJ7ztbogyGnTHbHJFl2',
		},
	],
	available_markets: [
		'AR',
		'AU',
		'AT',
		'BE',
		'BO',
		'BR',
		'BG',
		'CA',
		'CL',
		'CO',
		'CR',
		'CY',
		'CZ',
		'DK',
		'DO',
		'DE',
		'EC',
		'EE',
		'SV',
		'FI',
		'FR',
		'GR',
		'GT',
		'HN',
		'HK',
		'HU',
		'IS',
		'IE',
		'IT',
		'LV',
		'LT',
		'LU',
		'MY',
		'MT',
		'MX',
		'NL',
		'NZ',
		'NI',
		'NO',
		'PA',
		'PY',
		'PE',
		'PH',
		'PL',
		'PT',
		'SG',
		'SK',
		'ES',
		'SE',
		'CH',
		'TW',
		'TR',
		'UY',
		'US',
		'GB',
		'AD',
		'LI',
		'MC',
		'ID',
		'JP',
		'TH',
		'VN',
		'RO',
		'IL',
		'ZA',
		'SA',
		'AE',
		'BH',
		'QA',
		'OM',
		'KW',
		'EG',
		'MA',
		'DZ',
		'TN',
		'LB',
		'JO',
		'PS',
		'IN',
		'BY',
		'KZ',
		'MD',
		'UA',
		'AL',
		'BA',
		'HR',
		'ME',
		'MK',
		'RS',
		'SI',
		'KR',
		'BD',
		'PK',
		'LK',
		'GH',
		'KE',
		'NG',
		'TZ',
		'UG',
		'AG',
		'AM',
		'BS',
		'BB',
		'BZ',
		'BT',
		'BW',
		'BF',
		'CV',
		'CW',
		'DM',
		'FJ',
		'GM',
		'GE',
		'GD',
		'GW',
		'GY',
		'HT',
		'JM',
		'KI',
		'LS',
		'LR',
		'MW',
		'MV',
		'ML',
		'MH',
		'FM',
		'NA',
		'NR',
		'NE',
		'PW',
		'PG',
		'WS',
		'SM',
		'ST',
		'SN',
		'SC',
		'SL',
		'SB',
		'KN',
		'LC',
		'VC',
		'SR',
		'TL',
		'TO',
		'TT',
		'TV',
		'VU',
		'AZ',
		'BN',
		'BI',
		'KH',
		'CM',
		'TD',
		'KM',
		'GQ',
		'SZ',
		'GA',
		'GN',
		'KG',
		'LA',
		'MO',
		'MR',
		'MN',
		'NP',
		'RW',
		'TG',
		'UZ',
		'ZW',
		'BJ',
		'MG',
		'MU',
		'MZ',
		'AO',
		'CI',
		'DJ',
		'ZM',
		'CD',
		'CG',
		'IQ',
		'LY',
		'TJ',
		'VE',
		'ET',
		'XK',
	],
	disc_number: 2,
	duration_ms: 187373,
	explicit: false,
	external_ids: { isrc: 'GBAYE0601696' },
	external_urls: { spotify: 'https://open.spotify.com/track/5bIEpKwEFgJzB7U3gFaeKm' },
	href: 'https://api.spotify.com/v1/tracks/5bIEpKwEFgJzB7U3gFaeKm',
	id: '5bIEpKwEFgJzB7U3gFaeKm',
	is_local: false,
	name: 'Here Comes The Sun - Remastered 2009',
	popularity: 35,
	preview_url: 'https://p.scdn.co/mp3-preview/36e7496068fe92ffff9a43c4bb64163d9b8f96e5?cid=0f18e54abe0b4aedb4591e353d3aff69',
	track_number: 8,
	type: 'track',
	uri: 'spotify:track:5bIEpKwEFgJzB7U3gFaeKm',
}
export async function getSpotifyPlaylist(lang: 'ja' | 'en', showToaster: (m: string) => void) {
	const token = localStorage.getItem('spotifyV2Token')
	if (!token) return mockTrackItem
	const expires = localStorage.getItem('spotifyV2Expires') || `${new Date().getTime()}`
	const isExpired = new Date().getTime() / 1000 > Number.parseInt(expires, 10)
	const at = isExpired ? await refreshSpotifyToken() : localStorage.getItem('spotifyV2Token')
	if (!at) return mockTrackItem
	const playlist = lang === 'ja' ? jaPlaylist : enPlaylist
	const start = `https://api.spotify.com/v1/playlists/${playlist}/tracks`
	const json = await spotifyApi(start, showToaster)
	return json.items[0].track
}
