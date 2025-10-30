import type { Entity } from '@cutls/megalodon'
import Image from 'next/image'
import { FlexboxGrid, Panel } from 'rsuite'

import FailoverImg from '@/utils/failoverImg'
import { open } from '@/utils/openBrowser'

type Props = {
	card: Entity.Card
}

const LinkPreview: React.FC<Props> = (props) => {
	const onClick = () => {
		open(props.card.url)
	}

	return (
		<Panel bordered bodyFill onClick={onClick} style={{ cursor: 'pointer', marginTop: '0.2em' }}>
			<FlexboxGrid style={{ overflow: 'hidden' }}>
				<FlexboxGrid.Item style={{ width: '60px' }}>
					<Image width={60} height={60} src={FailoverImg(props.card.image)} alt={props.card.title} />
				</FlexboxGrid.Item>
				<FlexboxGrid.Item style={{ height: '60px', width: 'calc(100% - 60px)', overflow: 'hidden', paddingLeft: '10px', padding: '6px' }}>
					<p style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={props.card.title}>
						<strong>{props.card.title}</strong>
					</p>
					<p style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={props.card.description}>
						{props.card.description}
					</p>
				</FlexboxGrid.Item>
			</FlexboxGrid>
		</Panel>
	)
}

export default LinkPreview
