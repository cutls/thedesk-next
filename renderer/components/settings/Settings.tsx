import alert from '@/components/utils/alert'
import { TheDeskContext } from '@/context'
import { type Settings as SettingsType, type ThemeType, defaultSetting } from '@/entities/settings'
import type { localeType } from '@/i18n'
import { nowplayingCode, nowplayingDisconnect, nowplayingInit } from '@/utils/nowplaying'
import { readSettings, saveSetting } from '@/utils/storage'
import { useContext, useEffect, useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Button, ButtonToolbar, Form, Input, InputNumber, InputPicker, Modal, Panel, Radio, RadioGroup, Schema, useToaster } from 'rsuite'

type Props = {
	open: boolean
	onClose: () => void
	reloadAppearance: () => void
}

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

export default function Settings(props: Props) {
	const { formatMessage } = useIntl()
	const { setFocused } = useContext(TheDeskContext)
	const focusAttr = {
		onFocus: () => setFocused(true),
		onBlur: () => setFocused(false),
	}
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

	const appearanceModel = Schema.Model<SettingsType['appearance']>({
		font_size: Schema.Types.NumberType(formatMessage({ id: 'settings.settings.validation.general_number.type' }))
			.range(1, 30, formatMessage({ id: 'settings.settings.validation.general_number.range' }, { from: 1, to: 30 }))
			.isRequired(formatMessage({ id: 'settings.settings.validation.general_number.required' })),
		language: Schema.Types.StringType().isRequired(formatMessage({ id: 'settings.settings.validation.general_required' })),
		color_theme: Schema.Types.StringType(),
	})
	const timelineModel = Schema.Model<SettingsType['timeline']>({
		time: Schema.Types.StringType().isRequired(formatMessage({ id: 'settings.settings.validation.general_required' })),
		animation: Schema.Types.StringType().isRequired(formatMessage({ id: 'settings.settings.validation.general_required' })),
		max_length: Schema.Types.NumberType(formatMessage({ id: 'settings.settings.validation.general_number.type' }))
			.range(0, 3000, formatMessage({ id: 'settings.settings.validation.general_number.range' }, { from: 0, to: 3000 }))
			.isRequired(formatMessage({ id: 'settings.settings.validation.general_number.required' })),
		notification: Schema.Types.StringType().isRequired(formatMessage({ id: 'settings.settings.validation.general_required' })),
	})

	useEffect(() => {
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
			appearance: {
				font_size: Number(appearance.font_size),
				language: appearance.language,
				color_theme: appearance.color_theme,
			},
			timeline: {
				time: timelineConfig.time,
				animation: timelineConfig.animation,
				max_length: Number(timelineConfig.max_length),
				notification: timelineConfig.notification,
			},
			compose: {
				afterPost: compose.afterPost,
				btnPosition: compose.btnPosition,
				secondaryToot: compose.secondaryToot,
			},
		}
		await saveSetting({ obj: settings })
		props.reloadAppearance()
	}
	const nowplayingInitFn = () => {
		setSpotifyInitiating(true)
		nowplayingInit(spotifyDev, showToaster)
	}
	const nowplayingCodeFn = async () => {
		setSpotifyConnecting(true)
		try {
			await nowplayingCode(spotifyCode, showToaster)
			setSpotifyInitiating(false)
			setSpotifyConnected(!!localStorage.getItem('spotifyV2Token'))
		} catch (e: any) {
			showToaster('settings.nowplaying.error')
		} finally {
			setSpotifyConnecting(false)
		}
	}

	return (
		<Modal backdrop="static" keyboard={true} open={props.open} onClose={props.onClose}>
			<Modal.Header>
				<Modal.Title>
					<FormattedMessage id="settings.settings.title" />
				</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Form layout="horizontal" formValue={appearance} onChange={setAppearance} model={appearanceModel}>
					<Panel header={<FormattedMessage id="settings.settings.appearance.title" />}>
						<Form.Group controlId="language">
							<Form.ControlLabel>
								<FormattedMessage id="settings.settings.appearance.language" />
							</Form.ControlLabel>
							<Form.Control name="language" {...focusAttr} accepter={InputPicker} cleanable={false} data={languages} />
						</Form.Group>
						<Form.Group controlId="font_size">
							<Form.ControlLabel>
								<FormattedMessage id="settings.settings.appearance.font_size" />
							</Form.ControlLabel>
							<Form.Control name="font_size" {...focusAttr} accepter={InputNumber} postfix="px" />
						</Form.Group>
						<Form.Group controlId="color_theme">
							<Form.ControlLabel>
								<FormattedMessage id="settings.settings.appearance.color_theme" />
							</Form.ControlLabel>
							<Form.Control name="color_theme" {...focusAttr} accepter={InputPicker} cleanable={false} data={themes} />
						</Form.Group>
					</Panel>
				</Form>
				<Form layout="horizontal" formValue={timelineConfig} onChange={setTimelineConfig} model={timelineModel}>
					<Panel header={<FormattedMessage id="settings.settings.timeline.title" />}>
						<Form.Group controlId="time">
							<Form.ControlLabel>
								<FormattedMessage id="settings.settings.timeline.time.title" />
							</Form.ControlLabel>
							<Form.Control
								name="time"
								{...focusAttr}
								accepter={InputPicker}
								cleanable={false}
								data={time.map((t) => {
									return { label: formatMessage({ id: `settings.settings.timeline.time.${t}` }), value: t }
								})}
							/>
						</Form.Group>
						<Form.Group controlId="animation">
							<Form.ControlLabel>
								<FormattedMessage id="settings.settings.timeline.animation" />
							</Form.ControlLabel>
							<Form.Control accepter={RadioGroup} name="animation">
								<Radio value="no">
									<FormattedMessage id="timeline.settings.not_do" />
								</Radio>
								<Radio value="yes">
									<FormattedMessage id="timeline.settings.do" />
								</Radio>
							</Form.Control>
						</Form.Group>
						<Form.Group style={{ marginBottom: 0 }} controlId="max_length">
							<Form.ControlLabel>
								<FormattedMessage id="settings.settings.timeline.max_length" />
							</Form.ControlLabel>
							<Form.Control name="max_length" {...focusAttr} accepter={InputNumber} postfix={formatMessage({ id: 'settings.settings.timeline.max_length_unit' })} />
						</Form.Group>
						<p style={{ fontSize: '0.8rem', textAlign: 'right', paddingRight: '20px' }}>
							<FormattedMessage id="settings.settings.timeline.max_length_hint" />
						</p>
						<Form.Group controlId="notification">
							<Form.ControlLabel>
								<FormattedMessage id="settings.settings.timeline.notification" />
							</Form.ControlLabel>
							<Form.Control accepter={RadioGroup} name="notification">
								<Radio value="no">
									<FormattedMessage id="timeline.settings.not_do" />
								</Radio>
								<Radio value="yes">
									<FormattedMessage id="timeline.settings.do" />
								</Radio>
							</Form.Control>
						</Form.Group>
					</Panel>
				</Form>
				<Form layout="horizontal" formValue={compose} onChange={setCompose}>
					<Panel header={<FormattedMessage id="settings.settings.compose.title" />}>
						<p style={{ fontSize: '0.8rem' }}>
							<FormattedMessage id="settings.settings.require_reload" />
						</p>
						<Form.Group controlId="btnPosition" style={{ marginBottom: 0 }}>
							<Form.ControlLabel>
								<FormattedMessage id="settings.settings.compose.btnPosition.title" />
							</Form.ControlLabel>
							<Form.Control
								name="btnPosition"
								{...focusAttr}
								accepter={InputPicker}
								cleanable={false}
								data={btnPosition.map((t) => {
									return { label: formatMessage({ id: `settings.settings.compose.btnPosition.${t}` }), value: t }
								})}
							/>
						</Form.Group>
						<Form.Group controlId="afterPost">
							<Form.ControlLabel>
								<FormattedMessage id="settings.settings.compose.afterPost.title" />
							</Form.ControlLabel>
							<Form.Control
								name="afterPost"
								{...focusAttr}
								accepter={InputPicker}
								cleanable={false}
								data={afterPost.map((t) => {
									return { label: formatMessage({ id: `settings.settings.compose.afterPost.${t}` }), value: t }
								})}
							/>
						</Form.Group>
						<Form.Group controlId="secondaryToot" style={{ marginBottom: 0 }}>
							<Form.ControlLabel>
								<FormattedMessage id="settings.settings.compose.secondaryToot" />
							</Form.ControlLabel>
							<Form.Control
								name="secondaryToot"
								{...focusAttr}
								accepter={InputPicker}
								cleanable={false}
								data={[
									{ label: formatMessage({ id: 'timeline.settings.not_do' }), value: 'no' },
									...vis.map((t) => {
										return { label: formatMessage({ id: `compose.visibility.${t}` }), value: t }
									}),
								]}
							/>
						</Form.Group>
						<p style={{ fontSize: '0.8rem', textAlign: 'right', paddingRight: '20px' }}>
							<FormattedMessage id="settings.settings.compose.secondaryToot_hint" />
						</p>
					</Panel>
				</Form>
				<Panel header={<FormattedMessage id="settings.settings.spotify.title" />}>
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
				</Panel>
				<Form.Group>
					<ButtonToolbar style={{ justifyContent: 'flex-end' }}>
						<Button appearance="primary" color="green" type="submit" onClick={handleSubmit}>
							<FormattedMessage id="settings.settings.save" />
						</Button>
						<Button onClick={props.onClose}>
							<FormattedMessage id="settings.settings.close" />
						</Button>
					</ButtonToolbar>
				</Form.Group>
				<Button appearance="link" onClick={() => location.reload()}>
					<FormattedMessage id="settings.settings.reload" />
				</Button>
			</Modal.Body>
		</Modal>
	)
}
