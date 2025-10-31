import generator, { detector, type Entity, type WebSocketInterface } from '@cutls/megalodon'
import { createContext, useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import type { Server } from './entities/server'
import { defaultSetting, type Settings } from './entities/settings'
import type { Timeline, TimelineKind } from './entities/timeline'
import { getAccount, listServers, listTimelines } from './utils/storage'

export const TheDeskContext = createContext({
	timelineConfig: defaultSetting.timeline,
	saveTimelineConfig: (config: Settings['timeline']) => {},
	focused: false,
	setFocused: (focused: boolean) => {}
})
export const TimelineRefreshContext = createContext({
	timelineRefresh: (_str?: boolean) => {}
})
export const TheDeskProviderWrapper: React.FC = (props) => {
	const [focused, setFocused] = useState(false)
	const [timelineConfig, setTimelineConfig] = useState<Settings['timeline']>(defaultSetting.timeline)
	const saveTimelineConfig = (config: Settings['timeline']) => setTimelineConfig(config)
	

	return <TheDeskContext.Provider value={{ timelineConfig, saveTimelineConfig, focused, setFocused }}>{props.children}</TheDeskContext.Provider>
}
