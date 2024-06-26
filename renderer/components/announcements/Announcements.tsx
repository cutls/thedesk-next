import type { Account } from '@/entities/account'
import type { Server } from '@/entities/server'
import generator, { type Entity, type MegalodonInterface } from '@cutls/megalodon'
import { useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { Button, Carousel, Modal } from 'rsuite'

type Props = {
	opened: boolean
	server: Server
	account: Account
	close: () => void
}

export default function Announcements(props: Props) {
	const [announcements, setAnnouncements] = useState<Array<Entity.Announcement>>([])
	const [client, setClient] = useState<MegalodonInterface | null>(null)

	useEffect(() => {
		const client = generator(props.server.sns, props.server.base_url, props.account.access_token, 'Fedistar')
		setClient(client)
		const f = async () => {
			const a = await client.getInstanceAnnouncements()
			setAnnouncements(a.data)
		}
		f()
	}, [props.server, props.account])

	const onSelect = async (index: number) => {
		const target = announcements[index]
		if (target && client) {
			await client.dismissInstanceAnnouncement(target.id)
		}
	}

	return (
		<Modal size="sm" open={props.opened} onClose={props.close}>
			<Modal.Header>
				<Modal.Title>
					<FormattedMessage id="announcements.title" values={{ domain: props.server.domain }} />
				</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Carousel placement="bottom" shape="bar" onSelect={onSelect}>
					{announcements.map((announcement, index) => (
						<div key={announcement.id}>
							<div dangerouslySetInnerHTML={{ __html: announcement.content }} style={{ padding: '1em' }} />
						</div>
					))}
				</Carousel>
			</Modal.Body>
			<Modal.Footer>
				<Button appearance="subtle" onClick={props.close}>
					<FormattedMessage id="announcements.close" />
				</Button>
			</Modal.Footer>
		</Modal>
	)
}
