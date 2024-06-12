import { open } from '@/utils/openBrowser'
const apiGateway = 'https://ep9jquu2w4.execute-api.ap-northeast-1.amazonaws.com/thedesk/spotify'
export async function nowplaying(key: 'spotify' | 'appleMusic', showToaster: (message: string) => void) {
	if (key === 'spotify') {
		const token = localStorage.getItem('spotifyV2Token')
		if (!token) {
			nowplayingInit(false, showToaster)
		}
		const expires = localStorage.getItem('spotifyV2Expires') || `${new Date().getTime()}`
		const isExpired = new Date().getTime() / 1000 > Number.parseInt(expires, 10)
		const at = isExpired ? await refreshSpotifyToken() : localStorage.getItem('spotifyV2Token')
		if (!at) return showToaster('compose.nowplaying.error')
		const start = 'https://api.spotify.com/v1/me/player/currently-playing'
		if (at) {
			try {
				const jsonRaw = await fetch(start, {
					method: 'get',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${at}`,
					},
				})
				if (jsonRaw.status === 204) return
				const json = await jsonRaw.json()
				const item = json.item
				const img = item.album.images[0].url
				const file = new File([await (await fetch(img)).blob()], 'cover.jpg', { type: 'image/jpeg' })
				const contentRaw = localStorage.getItem('nowplayingTemplate')
				let content = contentRaw === 'null' || !contentRaw ? '#NowPlaying {song} / {album} / {artist}\n{url} #SpotifyWithTheDesk' : contentRaw
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
				return { text: content, file, title: `${item.name} ${item.album.name} ${item.artists[0].name}` }
			} catch (e: any) {
				await refreshSpotifyToken()
				showToaster('compose.nowplaying.error')
				return null
			}
		}
	} else if (key === 'appleMusic') {
		console.log('request')
		window.electronAPI.requestAppleMusic()
		type IFile = { text: string; file: File, title: string }
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
	} catch (e: any) { }
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

