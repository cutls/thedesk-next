import type { TimelineKind } from '@/entities/timeline'
import type { MessageDescriptor } from 'react-intl'

const timelineName = (timelineKind: TimelineKind, name: string, formatMessage: (descriptor: MessageDescriptor, values?: any, opt?: any) => string) => {
	switch (timelineKind) {
		case 'home':
			return formatMessage({ id: 'timeline.home' })
		case 'notifications':
			return formatMessage({ id: 'timeline.notifications' })
		case 'favourites':
			return formatMessage({ id: 'timeline.favourites' })
		case 'bookmarks':
			return formatMessage({ id: 'timeline.bookmarks' })
		case 'direct':
			return formatMessage({ id: 'timeline.direct' })
		case 'local':
			return formatMessage({ id: 'timeline.local' })
		case 'public':
			return formatMessage({ id: 'timeline.public' })
		default:
			return name
	}
}

export default timelineName
