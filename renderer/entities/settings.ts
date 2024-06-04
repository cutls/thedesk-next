import { localeType } from '../i18n'

export type Settings = {
  appearance: {
    font_size: number
    language: localeType
    color_theme: ThemeType
  }
}

export type ThemeType = 'dark' | 'light' | 'high-contrast'

export const defaultSetting: Settings = {
  appearance: {
    font_size: 14,
    language: 'en',
    color_theme: 'dark',
  },
}
