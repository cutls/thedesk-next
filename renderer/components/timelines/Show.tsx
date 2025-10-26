import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import { useState } from 'react'
import { ResizableBox } from 'react-resizable'
import ShowConversations from '@/components/timelines/Conversations'
import ShowNotifications from '@/components/timelines/Notifications'
import ShowTimeline from '@/components/timelines/Timeline'
import type { Server } from '@/entities/server'
import type { Timeline } from '@/entities/timeline'
import type { Unread } from '@/entities/unread'
import { updateColumnHeight } from '@/utils/storage'
import { useWindowSize } from '@/utils/useWindowSize'

type Props = {
	isLast: boolean
	stackLength: number
	timeline: Timeline
	server: Server
	unreads: Array<Unread>
	setUnreads: (a: Array<Unread>) => void
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	openReport: (status: Entity.Status, client: MegalodonInterface) => void
	openFromOtherAccount: (status: Entity.Status) => void
	wrapIndex: number
}
const ShowWrapped: React.FC<Props> = (props) => {
	const [_wWidth, wHeight] = useWindowSize()
	const [inResizing, setInResizing] = useState(false)
	const [columnHeight, setColumnHeight] = useState(props.timeline.column_height || 0)
	const columnHeightSet = async (h: number) => {
		const height = Math.round(h / 50) * 50
		setColumnHeight(height)
		await updateColumnHeight({ id: props.timeline.id, columnHeight: height })
	}
	return (
		<ResizableBox
			width={0}
			height={columnHeight || wHeight / props.stackLength}
			axis="y"
			onResizeStart={() => setInResizing(true)}
			style={{ margin: '4px 0', flexGrow: !columnHeight && !inResizing ? 1 : 'initial', minWidth: '100%' }}
			resizeHandles={props.isLast ? [] : ['s']}
			onResizeStop={(_, e) => columnHeightSet(e.size.height)}
		>
			<Show {...props} />
		</ResizableBox>
	)
}
const Show: React.FC<Props> = (props) => {
	if (props.timeline.kind === 'notifications') {
		return (
			<ShowNotifications
				wrapIndex={props.wrapIndex}
				timeline={props.timeline}
				server={props.server}
				unreads={props.unreads}
				setUnreads={props.setUnreads}
				openMedia={props.openMedia}
				openReport={props.openReport}
				openFromOtherAccount={props.openFromOtherAccount}
			/>
		)
	}
	if (props.timeline.kind === 'direct') {
		return <ShowConversations wrapIndex={props.wrapIndex} server={props.server} timeline={props.timeline} openMedia={props.openMedia} />
	}
	return (
		<ShowTimeline
			wrapIndex={props.wrapIndex}
			timeline={props.timeline}
			server={props.server}
			openMedia={props.openMedia}
			openReport={props.openReport}
			openFromOtherAccount={props.openFromOtherAccount}
		/>
	)
}

export default ShowWrapped
