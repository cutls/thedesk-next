import emojify from '@/utils/emojify'
import type { Entity } from 'megalodon'
import { useState, type Dispatch, type HTMLAttributes, type SetStateAction } from 'react'
import { FormattedMessage } from 'react-intl'
import { Button } from 'rsuite'
import LinkPreview from './LinkPreview'

type Props = {
	status: Entity.Status
	spoilered: boolean
	spoilerText: string
	setSpoilered: Dispatch<SetStateAction<boolean>>
	onClick?: (e: any) => void
} & HTMLAttributes<HTMLElement>

const Body: React.FC<Props> = (props) => {
	const { spoilered: startSpoilered, spoilerText } = props
	const [spoilered, setSpoilered] = useState(startSpoilered)

	const spoiler = () => {
		const isAuto = !props.status.spoiler_text || props.status.spoiler_text.length <= 0
		if (spoilerText.length > 0) {
			return (
				<div>
					{(spoilered || !isAuto) && <div
						className="spoiler-text"
						style={Object.assign({ overflowWrap: 'break-word', wordBreak: 'break-word' }, props.style)}
						dangerouslySetInnerHTML={{ __html: emojify(spoilerText, props.status.emojis) }}
						onClick={props.onClick}
					/>}
					<Button size="xs" onClick={() => setSpoilered((current) => !current)}>
						{spoilered ? (isAuto ? <FormattedMessage id="timeline.status.show_more_auto" /> : <FormattedMessage id="timeline.status.show_more" />) : <FormattedMessage id="timeline.status.show_less" />}
					</Button>
				</div>
			)
		}
		return null
	}

	return (
		<div className="body">
			{spoiler()}
			{!spoilered && (
				<div
					className="status-body"
					style={Object.assign({ oberflowWrap: 'break-word', wordBreak: 'break-word', userSelect: 'text' }, props.style)}
					dangerouslySetInnerHTML={{ __html: emojify(props.status.content, props.status.emojis) }}
					onClick={props.onClick}
				/>
			)}
			{!spoilered && props.status.card && props.status.card.type === 'link' && <LinkPreview card={props.status.card} />}
		</div>
	)
}

export default Body
