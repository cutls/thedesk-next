import { TheDeskContext } from '@/context'
import { defaultSetting, type Settings as SettingsType } from '@/entities/settings'
import { Context as i18nContext } from '@/i18n'
import { ContextLoadTheme } from '@/theme'
import { readSettings, saveSetting } from '@/utils/storage'
import dayjs from 'dayjs'
import Head from 'next/head'
import { type CSSProperties, useContext, useEffect, useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Heading, useToaster, Text, Content, Stack, Divider, Button, Input } from 'rsuite'
import alert from '@/components/utils/alert'
import NumberForm from '@/components/settings/form/NumberForm'
import SelectForm from '@/components/settings/form/SelectForm'
import RadioBoolean from '@/components/settings/form/RadioBooleanForm'
import { Icon } from '@rsuite/icons'
import { BsCheck2, BsChevronLeft } from 'react-icons/bs'
import { useRouter } from 'next/router'
import { nowplayingDisconnect } from '@/utils/nowplaying'
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
    const { start, latestTimelineRefreshed, allClose, saveTimelineConfig } = useContext(TheDeskContext)
    const [style, setStyle] = useState<CSSProperties>({})
    const [appearance, setAppearance] = useState<SettingsType['appearance']>(defaultSetting.appearance)
    const [timelineConfig, setTimelineConfig] = useState<SettingsType['timeline']>(defaultSetting.timeline)
    const [compose, setCompose] = useState<SettingsType['compose']>(defaultSetting.compose)

    const toast = useToaster()
    const showToaster = (message: string) => toast.push(alert('info', formatMessage({ id: message })), { placement: 'topStart' })
    const [spotifyConnected, setSpotifyConnected] = useState(false)
    const [spotifyDev, setSpotifyDev] = useState(true)
    const [spotifyInitiating, setSpotifyInitiating] = useState(false)
    const [spotifyConnecting, setSpotifyConnecting] = useState(false)
    const [spotifyCode, setSpotifyCode] = useState('')
    const visLabel = [{ label: formatMessage({ id: 'timeline.settings.not_do' }), value: 'no' }, ...vis.map((value) => ({ label: formatMessage({ id: `compose.visibility.${value}` }), value }))]

    const loadAppearance = () => {
        const lang = localStorage.getItem('lang') || window.navigator.language
        readSettings(lang).then((res) => {
            setStyle({
                fontSize: res.appearance.font_size,
            })
            switchLang(res.appearance.language)
            dayjs.locale(res.appearance.language)
            loadTheme()
            saveTimelineConfig(res.timeline)
            document.documentElement.setAttribute('lang', res.appearance.language)
        })
    }
    useEffect(() => {
        loadAppearance()
        const f = async () => {
            const settings = await readSettings()
            setAppearance((current) => Object.assign({}, current, settings.appearance))
            setTimelineConfig((current) => Object.assign({}, current, settings.timeline))
            setCompose((current) => Object.assign({}, current, settings.compose))
            setSpotifyConnected(!!localStorage.getItem('spotifyV2Token'))
        }
        f()
    }, [])
    const handleSubmit = async () => {
        const settings: SettingsType = {
            appearance, timeline: timelineConfig, compose
        }
        await saveSetting({ obj: settings })
        showToaster(formatMessage({ id: 'settings.settings.saved' }))
        loadAppearance()
    }

    const updateAppearance = (key: keyof SettingsType['appearance'], value: any) => setAppearance((current) => Object.assign({}, current, { [key]: value }))
    const updateTimeline = (key: keyof SettingsType['timeline'], value: any) => setTimelineConfig((current) => Object.assign({}, current, { [key]: value }))
    const updateCompose = (key: keyof SettingsType['compose'], value: any) => setCompose((current) => Object.assign({}, current, { [key]: value }))
    const labelValueBuilder = (prefix: string, values: string[]) => values.map((value) => ({ label: formatMessage({ id: `settings.settings.${prefix}.${value}` }), value }))
    function nowplayingInitFn(): void {
        throw new Error('Function not implemented.')
    }

    function nowplayingCodeFn(): void {
        throw new Error('Function not implemented.')
    }

    return (
        <div style={Object.assign({ backgroundColor: 'var(--rs-bg-well)' }, style)}>
            <Head>
                <title>TheDesk</title>
            </Head>
            <Stack justifyContent="space-between" style={{ position: 'fixed', padding: 10, backgroundColor: 'var(--rs-bg-overlay)', width: '100%' }}>
                <Button onClick={() => router.push('/')}>
                    <Icon as={BsChevronLeft} style={{ fontSize: '1.4em' }} />
                </Button>
                <Heading style={{ fontSize: 24, fontWeight: 'bold' }}><FormattedMessage id="settings.settings.title" /></Heading>
                <Button appearance="primary" color="green" type="submit" onClick={handleSubmit} startIcon={<BsCheck2 />}>
                    <FormattedMessage id="settings.settings.save" />
                </Button>
            </Stack>
            <Stack style={{ justifyContent: 'center', display: 'flex' }}>
                <Content style={{ width: 600, maxWidth: '100%', padding: 10, marginTop: 50, marginBottom: 50 }}>
                    <Text style={{ fontSize: 24, marginTop: 12, fontWeight: 'bold' }}><FormattedMessage id="settings.settings.appearance.title" /></Text>
                    <NumberForm label={formatMessage({ id: 'settings.settings.appearance.font_size' })} value={appearance.font_size} onChange={(value) => updateAppearance('font_size', value)} min={12} max={24} step={1} unit="px" />
                    <SelectForm label={formatMessage({ id: 'settings.settings.appearance.language' })} value={appearance.language} onChange={(value) => updateAppearance('language', value)} data={languages} style={{ width: '100%' }} />
                    <SelectForm label={formatMessage({ id: 'settings.settings.appearance.color_theme' })} value={appearance.color_theme} onChange={(value) => updateAppearance('color_theme', value)} data={themes} searchable={false} style={{ width: '100%' }} />
                    <Divider />
                    <Text style={{ fontSize: 24, marginTop: 12, fontWeight: 'bold' }}><FormattedMessage id="settings.settings.timeline.title" /></Text>
                    <SelectForm label={formatMessage({ id: 'settings.settings.timeline.time.title' })} value={timelineConfig.time} onChange={(value) => updateTimeline('time', value)} data={labelValueBuilder('timeline.time', time)} searchable={false} style={{ width: '100%' }} />
                    <RadioBoolean label={formatMessage({ id: 'settings.settings.timeline.animation' })} value={timelineConfig.animation} onChange={(value) => updateTimeline('animation', value)} />
                    <NumberForm label={formatMessage({ id: 'settings.settings.timeline.max_length' })} hint={formatMessage({ id: 'settings.settings.timeline.max_length_hint' })} value={timelineConfig.max_length} onChange={(value) => updateTimeline('max_length', value)} min={0} max={100} step={1} unit={formatMessage({ id: 'settings.settings.timeline.max_length_unit' })} />
                    <RadioBoolean label={formatMessage({ id: 'settings.settings.timeline.notification' })} value={timelineConfig.notification} onChange={(value) => updateTimeline('notification', value)} />
                    <Divider />
                    <Text style={{ fontSize: 24, marginTop: 12, fontWeight: 'bold' }}><FormattedMessage id="settings.settings.compose.title" /></Text>
                    <SelectForm label={formatMessage({ id: 'settings.settings.compose.btnPosition.title' })} value={compose.btnPosition} onChange={(value) => updateCompose('btnPosition', value)} data={labelValueBuilder('compose.btnPosition', btnPosition)} searchable={false} style={{ width: '100%' }} />
                    <SelectForm label={formatMessage({ id: 'settings.settings.compose.afterPost.title' })} value={compose.afterPost} onChange={(value) => updateCompose('afterPost', value)} data={labelValueBuilder('compose.afterPost', afterPost)} searchable={false} style={{ width: '100%' }} />
                    <SelectForm label={formatMessage({ id: 'settings.settings.compose.secondaryToot' })} hint={formatMessage({ id: 'settings.settings.compose.secondaryToot_hint' })} value={compose.secondaryToot} onChange={(value) => updateCompose('secondaryToot', value)} data={visLabel} searchable={false} style={{ width: '100%' }} />
                    <Divider />
                    <Text style={{ fontSize: 24, marginTop: 12, fontWeight: 'bold', marginBottom: 10 }}><FormattedMessage id="settings.settings.spotify.title" /></Text>
                    <Button appearance="primary" disabled={spotifyConnected} style={{ marginRight: '5px' }} color="green" onClick={() => nowplayingInitFn()}>
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
					{spotifyInitiating && (
						<div style={{ marginTop: '5px' }}>
							<Input value={spotifyCode} onChange={(e) => setSpotifyCode(e)} placeholder={formatMessage({ id: 'settings.settings.spotify.code_help' })} />
							<Button appearance="ghost" loading={spotifyConnecting} disabled={!spotifyCode} color="green" onClick={() => nowplayingCodeFn()}>
								<FormattedMessage id="settings.settings.spotify.code" />
							</Button>
						</div>
					)}
                    <Divider />
                    <Button appearance="ghost" onClick={() =>  window.electronAPI.openAppDataFolder()}><FormattedMessage id="settings.settings.open_appData_folder" /></Button>
                    <Text style={{ fontSize: 10, margin: 10 }}>
                    <FormattedMessage id="settings.settings.appData_hint" />
                    </Text>
                </Content>
            </Stack>
        </div>
    )
}
export default App
