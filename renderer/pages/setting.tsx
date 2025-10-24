import NumberForm from '@/components/settings/form/NumberForm'
import RadioBoolean from '@/components/settings/form/RadioBooleanForm'
import RadioForm from '@/components/settings/form/RadioForm'
import SelectForm from '@/components/settings/form/SelectForm'
import alert from '@/components/utils/alert'
import { TheDeskContext } from '@/context'
import { type Settings as SettingsType, defaultSetting } from '@/entities/settings'
import { Context as i18nContext } from '@/i18n'
import { ContextLoadTheme } from '@/theme'
import { getSpotifyPlaylist, nowplayingCode, nowplayingDisconnect, nowplayingInit, spotifyTemplateReplace } from '@/utils/nowplaying'
import { readSettings, saveSetting } from '@/utils/storage'
import { Icon } from '@rsuite/icons'
import dayjs from 'dayjs'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { type CSSProperties, useContext, useEffect, useState } from 'react'
import { BsCheck2, BsChevronLeft } from 'react-icons/bs'
import { FormattedMessage, useIntl } from 'react-intl'
import { Badge, Button, Content, Divider, Heading, Input, Loader, SelectPicker, Stack, useToaster } from 'rsuite'
const languages = [
	{
		label: 'English',
		value: 'en',
	},
	{
		label: '日本語',
		value: 'ja',
	},
]
const themes = [
	{
		label: 'Dark',
		value: 'dark',
	},
	{
		label: 'Light',
		value: 'light',
	},
	{
		label: 'HighContrast',
		value: 'high-contrast',
	},
]
const time = ['relative', 'absolute', '12h']
const afterPost = ['close', 'stay']
const btnPosition = ['left', 'right']
const vis = ['public', 'unlisted', 'private', 'direct']

function App() {
	const router = useRouter()
	const { formatMessage } = useIntl()
	const { loadTheme } = useContext(ContextLoadTheme)
	const { switchLang } = useContext(i18nContext)
	const { saveTimelineConfig } = useContext(TheDeskContext)
	const [style, setStyle] = useState<CSSProperties>({})
	const [fonts, setFonts] = useState<string[]>([])
	const [appearance, setAppearance] = useState<SettingsType['appearance']>(defaultSetting.appearance)
	const [timelineConfig, setTimelineConfig] = useState<SettingsType['timeline']>(defaultSetting.timeline)
	const [compose, setCompose] = useState<SettingsType['compose']>(defaultSetting.compose)
	const [currentPath, setCurrentPath] = useState<string | undefined>(undefined)

	const toast = useToaster()
	const showToaster = (message: string) => toast.push(alert('info', formatMessage({ id: message })), { placement: 'topStart' })
	const [spotifyDev, setSpotifyDev] = useState(true)
	const [spotifyConnected, setSpotifyConnected] = useState(false)
	const [spotifyInitiating, setSpotifyInitiating] = useState(false)
	const [spotifyConnecting, setSpotifyConnecting] = useState(false)
	const [templateFocused, setTemplateFocused] = useState(false)
	const [demoTrack, setDemoTrack] = useState<any>(null)
	const [demoTrackLoading, setDemoTrackLoading] = useState(false)
	const [spotifyCode, setSpotifyCode] = useState('')
	const [spotifyTemp, setSpotifyTemp] = useState('')
	const visLabel = [{ label: formatMessage({ id: 'timeline.settings.not_do' }), value: 'no' }, ...vis.map((value) => ({ label: formatMessage({ id: `compose.visibility.${value}` }), value }))]

	const loadAppearance = () => {
		const lang = localStorage.getItem('lang') || window.navigator.language
		readSettings(lang).then((res) => {
			setStyle({
				fontSize: `${res.appearance.font_size}px`,
				fontFamily: res.appearance.font,
			})
			switchLang(res.appearance.language)
			dayjs.locale(res.appearance.language)
			loadTheme()
			saveTimelineConfig(res.timeline)
			document.documentElement.setAttribute('lang', res.appearance.language)
		})
	}
	useEffect(() => {
		setFonts(['sans-serif', ...JSON.parse(localStorage.getItem('fonts') || '[]')])
		if (location.protocol !== 'http:') setCurrentPath(location.href.replace('setting.html', ''))
		loadAppearance()
		setSpotifyTemp(localStorage.getItem('spotifyTemplate') || '#NowPlaying {song} / {album} / {artist}\n{url} #SpotifyWithTheDesk')
		const f = async () => {
			const settings = await readSettings()
			setAppearance((current) => Object.assign({}, current, settings.appearance))
			setTimelineConfig((current) => Object.assign({}, current, settings.timeline))
			setCompose((current) => Object.assign({}, current, settings.compose))
			setSpotifyConnected(!!localStorage.getItem('spotifyV2Token'))
		}
		f()
		setSpotifyDev(location.protocol !== 'file:')
	}, [])
	const handleSubmit = async () => {
		const settings: SettingsType = {
			appearance,
			timeline: timelineConfig,
			compose,
		}
		await saveSetting({ obj: settings })
		localStorage.setItem('spotifyTemplate', spotifyTemp)
		showToaster(formatMessage({ id: 'settings.settings.saved' }))
		loadAppearance()
	}

	const updateAppearance = (key: keyof SettingsType['appearance'], value: any) => setAppearance((current) => Object.assign({}, current, { [key]: value }))
	const updateTimeline = (key: keyof SettingsType['timeline'], value: any) => setTimelineConfig((current) => Object.assign({}, current, { [key]: value }))
	const updateCompose = (key: keyof SettingsType['compose'], value: any) => setCompose((current) => Object.assign({}, current, { [key]: value }))
	const labelValueBuilder = (prefix: string, values: string[]) => values.map((value) => ({ label: formatMessage({ id: `settings.settings.${prefix}.${value}` }), value }))
	const nowplayingInitFn = () => {
		setSpotifyInitiating(true)
		nowplayingInit(spotifyDev, showToaster)
	}
	const nowplayingCodeFn = async () => {
		try {
			await nowplayingCode(spotifyCode, showToaster)
			setSpotifyConnected(true)
		} finally {
			setSpotifyInitiating(false)
		}
	}
	const getDemoTrack = async () => {
		setDemoTrackLoading(true)
		try {
			const track = await getSpotifyPlaylist(appearance.language, showToaster)
			setDemoTrack(track)
		} finally {
			setDemoTrackLoading(false)
		}
	}
	const reloadIsConnected = () => setSpotifyConnected(!!localStorage.getItem('spotifyV2Token'))
	const deleteAllData = () => {
		if (confirm(formatMessage({ id: 'settings.settings.delete_allData_confirm' }))) {
			localStorage.clear()
			location.href = './'
		}
	}

	return (
		<div style={Object.assign({ backgroundColor: 'var(--rs-bg-well)' }, style)}>
			<Head>
				<title>TheDesk</title>
			</Head>
			<Stack justifyContent="space-between" style={{ position: 'fixed', padding: 10, backgroundColor: 'var(--rs-bg-overlay)', width: '100%', zIndex: 999 }}>
				<Button onClick={() => router.push('./', currentPath ? `${currentPath}index.html` : undefined)}>
					<Icon as={BsChevronLeft} style={{ fontSize: '1.4em' }} />
				</Button>
				<Heading style={{ fontSize: '1.3em', fontWeight: 'bold' }}>
					<FormattedMessage id="settings.settings.title" />
				</Heading>
				<Button appearance="primary" color="green" type="submit" onClick={handleSubmit} startIcon={<BsCheck2 />}>
					<FormattedMessage id="settings.settings.save" />
				</Button>
			</Stack>
			<Stack style={{ justifyContent: 'center', display: 'flex' }}>
				<Content style={{ width: 600, maxWidth: '100%', padding: 10, marginTop: 50, marginBottom: 50 }}>
					<p style={{ fontSize: '1.3em', marginTop: 12, fontWeight: 'bold' }}>
						<FormattedMessage id="settings.settings.appearance.title" />
					</p>
					<NumberForm
						label={formatMessage({ id: 'settings.settings.appearance.font_size' })}
						value={appearance.font_size}
						onChange={(value) => updateAppearance('font_size', value)}
						min={14}
						max={22}
						step={1}
						unit="px"
						fontSize="1.1em"
					/>
					<SelectForm
						label={formatMessage({ id: 'settings.settings.appearance.language' })}
						value={appearance.language}
						onChange={(value) => updateAppearance('language', value)}
						data={languages}
						style={{ width: '100%' }}
						fontSize="1.1em"
					/>
					<SelectForm
						label={formatMessage({ id: 'settings.settings.appearance.color_theme' })}
						value={appearance.color_theme}
						onChange={(value) => updateAppearance('color_theme', value)}
						data={themes}
						searchable={false}
						style={{ width: '100%' }}
						fontSize="1.1em"
					/>
					<p style={{ marginTop: 15, marginBottom: 5, fontSize: '1.1em' }}>
						<FormattedMessage id="settings.settings.appearance.font" />
					</p>
					<SelectPicker
						value={appearance.font}
						data={fonts.map((value) => ({ label: value === 'sans-serif' ? formatMessage({ id: 'settings.settings.appearance.systemFont' }) : value, value }))}
						searchable={true}
						style={{ width: '100%' }}
						onChange={(value) => updateAppearance('font', value)}
						renderMenuItem={(label, item) => <p style={{ fontFamily: item.label.toString() }}>{item.label}</p>}
					/>
					<Divider />
					<p style={{ fontSize: '1.3em', marginTop: 12, fontWeight: 'bold' }}>
						<FormattedMessage id="settings.settings.timeline.title" />
					</p>
					<SelectForm
						label={formatMessage({ id: 'settings.settings.timeline.time.title' })}
						value={timelineConfig.time}
						onChange={(value) => updateTimeline('time', value)}
						data={labelValueBuilder('timeline.time', time)}
						searchable={false}
						style={{ width: '100%' }}
						fontSize="1.1em"
					/>
					<RadioBoolean label={formatMessage({ id: 'settings.settings.timeline.animation' })} value={timelineConfig.animation} onChange={(value) => updateTimeline('animation', value)} />
					<NumberForm
						label={formatMessage({ id: 'settings.settings.timeline.max_length' })}
						hint={formatMessage({ id: 'settings.settings.timeline.max_length_hint' })}
						value={timelineConfig.max_length}
						onChange={(value) => updateTimeline('max_length', value > 0 ? Math.max(value, 10) : 0)}
						min={0}
						max={1000}
						step={1}
						unit={formatMessage({ id: 'settings.settings.timeline.max_length_unit' })}
						fontSize="1.1em"
					/>
					<RadioBoolean
						label={formatMessage({ id: 'settings.settings.timeline.notification' })}
						hint={formatMessage({ id: 'settings.settings.timeline.notification_hint' })}
						value={timelineConfig.notification}
						onChange={(value) => updateTimeline('notification', value)}
						fontSize="1.1em"
					/>
					<RadioForm
						label={formatMessage({ id: 'settings.settings.timeline.ttsProvider.title' })}
						hint={formatMessage({ id: 'settings.settings.timeline.ttsProvider.hint' })}
						value={timelineConfig.ttsProvider}
						onChange={(value) => updateTimeline('ttsProvider', value)}
						data={labelValueBuilder('timeline.ttsProvider', ['system', 'bouyomi'])}
						fontSize="1.1em"
					/>
					{timelineConfig.ttsProvider === 'bouyomi' && (
						<NumberForm
							label={formatMessage({ id: 'settings.settings.timeline.ttsPort' })}
							value={timelineConfig.ttsPort}
							onChange={(value) => updateTimeline('ttsPort', value)}
							min={5000}
							max={65535}
							step={1}
							unit=""
						fontSize="1.1em"
						/>
					)}
					<Divider />
					<p style={{ fontSize: '1.3em', marginTop: 12, fontWeight: 'bold' }}>
						<FormattedMessage id="settings.settings.compose.title" />
					</p>
					<SelectForm
						label={formatMessage({ id: 'settings.settings.compose.btnPosition.title' })}
						value={compose.btnPosition}
						onChange={(value) => updateCompose('btnPosition', value)}
						data={labelValueBuilder('compose.btnPosition', btnPosition)}
						searchable={false}
						style={{ width: '100%' }}
						fontSize="1.1em"
					/>
					<SelectForm
						label={formatMessage({ id: 'settings.settings.compose.afterPost.title' })}
						value={compose.afterPost}
						onChange={(value) => updateCompose('afterPost', value)}
						data={labelValueBuilder('compose.afterPost', afterPost)}
						searchable={false}
						style={{ width: '100%' }}
						fontSize="1.1em"
					/>
					<SelectForm
						label={formatMessage({ id: 'settings.settings.compose.secondaryToot' })}
						hint={formatMessage({ id: 'settings.settings.compose.secondaryToot_hint' })}
						value={compose.secondaryToot}
						onChange={(value) => updateCompose('secondaryToot', value)}
						data={visLabel}
						searchable={false}
						style={{ width: '100%' }}
						fontSize="1.1em"
					/>
					<Divider />
					<p style={{ fontSize: '1.3em', marginTop: 12, fontWeight: 'bold', marginBottom: 10 }}>
						<FormattedMessage id="settings.settings.spotify.title" />
					</p>
					<Button appearance="primary" disabled={spotifyConnected || spotifyInitiating} style={{ marginRight: '5px' }} color="green" onClick={() => nowplayingInitFn()}>
						<FormattedMessage id="settings.settings.spotify.connect" />
					</Button>
					<Button
						appearance="primary"
						disabled={!spotifyConnected}
						color="green"
						onClick={() => {
							nowplayingDisconnect()
							setSpotifyConnected(false)
						}}
					>
						<FormattedMessage id="settings.settings.spotify.disconnect" />
					</Button>
					<Button appearance="link" onClick={() => reloadIsConnected()} style={{ marginLeft: '5px' }}>
						<FormattedMessage id="settings.settings.reload" />
					</Button>
					{spotifyInitiating && spotifyDev && (
						<div style={{ marginTop: '5px' }}>
							<Input value={spotifyCode} onChange={(e) => setSpotifyCode(e)} placeholder={formatMessage({ id: 'settings.settings.spotify.code_help' })} />
							<Button appearance="ghost" loading={spotifyConnecting} disabled={!spotifyCode} color="green" onClick={() => nowplayingCodeFn()}>
								<FormattedMessage id="settings.settings.spotify.code" />
							</Button>
						</div>
					)}
					<p style={{ fontSize: '1.3em', marginTop: 12, fontWeight: 'bold' }}>
						<FormattedMessage id="settings.settings.spotify.template" />
					</p>
					<Input as="textarea" rows={3} value={spotifyTemp} onChange={(e) => setSpotifyTemp(e)} onFocus={() => getDemoTrack()} />
					<p style={{ fontSize: 10, margin: 10 }}>
						<FormattedMessage id="settings.settings.spotify.tag" />: {'{song} {album} {artist} {url} {composer} {hz} {bitRate} {lyricist} {bpm} {genre}'}
					</p>
					{(!!demoTrack || demoTrackLoading) && (
						<div style={{ padding: 5, backgroundColor: 'var(--rs-input-bg)' }}>
							<Badge color="blue" content={formatMessage({ id: 'settings.settings.spotify.demo' })} style={{ marginBottom: 5 }} />
							{demoTrackLoading ? (
								<p>
									<Loader />
								</p>
							) : (
								<p>{spotifyTemplateReplace(demoTrack, spotifyTemp)}</p>
							)}
						</div>
					)}
					<Divider />
					<Button appearance="ghost" onClick={() => window.electronAPI.openAppDataFolder()}>
						<FormattedMessage id="settings.settings.open_appData_folder" />
					</Button>

					<Button appearance="primary" onClick={() => deleteAllData()}>
						<FormattedMessage id="settings.settings.delete_allData" />
					</Button>
					<p style={{ fontSize: 10, margin: 10 }}>
						<FormattedMessage id="settings.settings.appData_hint" />
					</p>
				</Content>
			</Stack>
		</div>
	)
}
export default App
