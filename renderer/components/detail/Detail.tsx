import { useRouter } from 'next/router'
import { type Dispatch, useEffect, useState } from 'react'
import { Animation, Container } from 'rsuite'

import type { Entity, MegalodonInterface } from '@cutls/megalodon'
import FollowedHashtags from './FollowedHashtags'
import ListDetail from './List'
import ListsDetail from './Lists'
import Profile from './Profile'
import Status from './Status'
import TagDetail from './Tag'

type Props = {
	dispatch: Dispatch<{ target: string; value: boolean; object?: any; index?: number }>
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	openReport: (status: Entity.Status, client: MegalodonInterface) => void
	openFromOtherAccount: (status: Entity.Status) => void
	openListMemberships: (list: Entity.List, client: MegalodonInterface) => void
	openAddListMember: (user: Entity.Account, client: MegalodonInterface) => void
}

const Detail: React.FC<Props> = (props) => {
	const [target, setTarget] = useState<'status' | 'profile' | 'tag' | 'lists' | 'list' | 'followed_hashtags' | null>(null)
	const router = useRouter()

	useEffect(() => {
		if (router.query.status_id) {
			setTarget('status')
		} else if (router.query.user_id) {
			setTarget('profile')
		} else if (router.query.tag) {
			setTarget('tag')
		} else if (router.query.lists === 'all') {
			setTarget('lists')
		} else if (router.query.list_id) {
			setTarget('list')
		} else if (router.query.followed_hashtags === 'all') {
			setTarget('followed_hashtags')
		} else {
			setTarget(null)
		}
	}, [router.query])

	return (
		<Animation.Transition in={target !== null} exitedClassName="detail-exited" exitingClassName="detail-exiting" enteredClassName="detail-entered" enteringClassName="detail-entering">
			{(p, ref) => (
				<div {...p} ref={ref}>
					<Container className="profile" style={{ height: '100%', borderLeft: '1px solid var(--rs-border-primary)', overflow: 'hidden' }}>
						{target === 'status' && (
							<Status
								openMedia={(media: Array<Entity.Attachment>, index: number) => props.dispatch({ target: 'media', value: true, object: media, index: index })}
								openReport={props.openReport}
								openFromOtherAccount={props.openFromOtherAccount}
							/>
						)}
						{target === 'profile' && (
							<Profile openMedia={props.openMedia} openReport={props.openReport} openFromOtherAccount={props.openFromOtherAccount} openAddListMember={props.openAddListMember} />
						)}
						{target === 'tag' && <TagDetail openMedia={props.openMedia} openReport={props.openReport} openFromOtherAccount={props.openFromOtherAccount} />}
						{target === 'lists' && <ListsDetail openListMemberships={props.openListMemberships} />}
						{target === 'list' && <ListDetail openMedia={props.openMedia} openReport={props.openReport} openFromOtherAccount={props.openFromOtherAccount} />}
						{target === 'followed_hashtags' && <FollowedHashtags />}
					</Container>
				</div>
			)}
		</Animation.Transition>
	)
}

export default Detail
