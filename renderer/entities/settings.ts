import type { localeType } from '../i18n'
type FormBoolean = 'yes' | 'no'
export type Settings = {
	appearance: {
		font_size: number
		language: localeType
		color_theme: ThemeType
	},
	timeline: {
		time: 'relative' | 'absolute' | '12h'
		animation: FormBoolean,
		max_length: number
	},
	compose: {
		afterPost: 'close' | 'stay',
		secondaryToot: 'no' | "public" | "unlisted" | "private" | "direct"
	}
}

export type ThemeType = 'dark' | 'light' | 'high-contrast'

export const defaultSetting: Settings = {
	appearance: {
		font_size: 14,
		language: 'en',
		color_theme: 'dark',
	},
	timeline: {
		time: 'relative',
		animation: 'yes',
		max_length: 0
	},
	compose: {
		afterPost: 'close',
		secondaryToot: 'no'
	}
}
