import { createContext, useState, useEffect } from 'react'
import { Account } from './entities/account'
import generator, { WebSocketInterface, detector } from 'megalodon'
import { Server } from './entities/server'
import { Timeline } from './entities/timeline'
import { getAccount, getServer, listTimelines } from './utils/storage'

export const StreamingContext = createContext({
    start: async () => {},
    listen: ((channel: string, callback: any) => null) as <T>(channel: string, callback: (a: { payload: T }) => void) => void | null,
    allClose: () => {},
    timelineRefresh: () => {},
    latestTimelineRefreshed: new Date().getTime()
})

export const StreamingProviderWrapper: React.FC = props => {
    let streamings: WebSocketInterface[] = []
    const [latestTimelineRefreshed, setLatestTimelineRefreshed] = useState(new Date().getTime())
    const start = async () => {
        const timelines = await listTimelines()
        for (const [timeline, server] of timelines) {
            const accountId = server.account_id
            const [account] = await getAccount({ id: accountId })
            const sns = await detector(server.base_url)
            const client = generator(sns, server.base_url, account.access_token)
            let streaming: WebSocketInterface
            if (timeline.kind === 'public') streaming = await client.publicStreaming()
            streamings.push(streaming)
        }
    }
    const listen = async (channel: string, callback: any) => {
        while (streamings.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
        if (channel === 'receive-timeline-status') {
            for (let i = 0; i < streamings.length; i++) {
                const streaming = streamings[i]
                if (!streaming) continue
                streaming.on('update', (status) => {
                    callback({ payload: { status: status, timeline_id: i + 1 } })
                })
            }
        }
        return () => {
            for (const streaming of streamings) streaming.removeListener(channel, callback)
        }
    }
    const allClose = () => {
        for (const streaming of streamings) streaming.stop()
    }
    const timelineRefresh = () => {
        setLatestTimelineRefreshed(new Date().getTime())
    }


    return (
        <StreamingContext.Provider value={{ listen, start, allClose, timelineRefresh, latestTimelineRefreshed }}>
            {props.children}
        </StreamingContext.Provider>
    )
}
