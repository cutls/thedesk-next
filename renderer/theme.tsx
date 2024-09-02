import { createContext, useEffect, useState } from 'react'
import { CustomProvider, type CustomProviderProps } from 'rsuite'
import { Settings } from './entities/settings'
import { UpdatedSettingsPayload } from './payload'
import { readSettings } from './utils/storage'

type Props = {
	children: React.ReactNode
}

const initValue: CustomProviderProps = {
	theme: 'dark',
}

export const Context = createContext(initValue)
export const ContextLoadTheme = createContext({
	loadTheme: async () => {},
})

export const RsuiteProviderWrapper: React.FC<Props> = (props) => {
	const [theme, setTheme] = useState<'dark' | 'light' | 'high-contrast'>('dark')
	useEffect(() => {
		loadTheme()
	}, [])

	const loadTheme = async () => {
		const settings = await readSettings()
		setTheme(settings.appearance.color_theme)
	}

	return (
		<ContextLoadTheme.Provider value={{ loadTheme }}>
			<Context.Provider value={{ theme }}>
				<CustomProvider theme={theme}>{props.children}</CustomProvider>
			</Context.Provider>
		</ContextLoadTheme.Provider>
	)
}
