import { TheDeskContext } from '@/context'
import { Context as i18nContext } from '@/i18n'
import { ContextLoadTheme } from '@/theme'
import { readSettings } from '@/utils/storage'
import dayjs from 'dayjs'
import { Head } from 'next/document'
import { type CSSProperties, useContext, useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import style from 'styled-jsx/style'

function App() {
	const { formatMessage } = useIntl()
	const { loadTheme } = useContext(ContextLoadTheme)
	const { switchLang } = useContext(i18nContext)
	const { start, latestTimelineRefreshed, allClose, saveTimelineConfig } = useContext(TheDeskContext)
	const [style, setStyle] = useState<CSSProperties>({})

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
	}, [])
	return (
		<div className="container index" style={Object.assign({ backgroundColor: 'var(--rs-bg-well)', width: '100%', overflow: 'hidden' }, style)}>
			<Head>
				<title>TheDesk</title>
			</Head>
		</div>
	)
}
