import type { localeType } from '../i18n'

type FormBoolean = 'yes' | 'no'
export type Settings = {
	appearance: {
		font_size: number
		language: localeType
		color_theme: ThemeType
		font: string
	}
	timeline: {
		time: 'relative' | 'absolute' | '12h'
		animation: FormBoolean
		max_length: number
		notification: FormBoolean
		ttsProvider: 'system' | 'bouyomi'
		ttsPort: number
		cropImage: 'cover' | 'contain'
	}
	compose: {
		btnPosition: 'left' | 'right'
		afterPost: 'close' | 'stay'
		secondaryToot: 'no' | 'public' | 'unlisted' | 'private' | 'direct'
	}
}

export type ThemeType = 'dark' | 'light' | 'high-contrast'

export const defaultSetting: Settings = {
	appearance: {
		font_size: 14,
		language: 'en',
		color_theme: 'dark',
		font: 'sans-serif'
	},
	timeline: {
		time: 'relative',
		animation: 'yes',
		max_length: 0,
		notification: 'yes',
		ttsProvider: 'system',
		ttsPort: 50080,
		cropImage: 'cover'
	},
	compose: {
		btnPosition: 'right',
		afterPost: 'close',
		secondaryToot: 'no'
	}
}
