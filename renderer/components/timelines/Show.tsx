import ShowConversations from '@/components/timelines/Conversations'
import ShowNotifications from '@/components/timelines/Notifications'
import ShowTimeline from '@/components/timelines/Timeline'
import type { Server } from '@/entities/server'
import type { Timeline } from '@/entities/timeline'
import type { Unread } from '@/entities/unread'
import type { Entity, MegalodonInterface } from 'megalodon'

type Props = {
	timeline: Timeline
	server: Server
	unreads: Array<Unread>
	setUnreads: (a: Array<Unread>) => void
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	openReport: (status: Entity.Status, client: MegalodonInterface) => void
	openFromOtherAccount: (status: Entity.Status) => void
}

const Show: React.FC<Props> = (props) => {
	if (props.timeline.kind === 'notifications') {
		return (
			<ShowNotifications
				timeline={props.timeline}
				server={props.server}
				unreads={props.unreads}
				setUnreads={props.setUnreads}
				openMedia={props.openMedia}
				openReport={props.openReport}
				openFromOtherAccount={props.openFromOtherAccount}
			/>
		)
	} else if (props.timeline.kind === 'direct') {
		return <ShowConversations server={props.server} timeline={props.timeline} openMedia={props.openMedia} />
	} else {
		return <ShowTimeline timeline={props.timeline} server={props.server} openMedia={props.openMedia} openReport={props.openReport} openFromOtherAccount={props.openFromOtherAccount} />
	}
}

export default Show
