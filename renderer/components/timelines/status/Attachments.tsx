import type { ColumnWidth } from '@/entities/timeline'
import failoverImg from '@/utils/failoverImg'
import { open } from '@/utils/openBrowser'
import { Icon } from '@rsuite/icons'
import type { Entity } from '@cutls/megalodon'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { BsBoxArrowUpRight, BsCaretRightFill, BsEyeSlash, BsVolumeUp } from 'react-icons/bs'
import { FormattedMessage } from 'react-intl'
import { Button, IconButton } from 'rsuite'
import { Blurhash } from 'react-blurhash'

type Props = {
	attachments: Array<Entity.Attachment>
	sensitive: boolean
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	columnWidth: number
}

const Attachments: React.FC<Props> = (props) => {
	const [sensitive, setSensitive] = useState<boolean>(props.sensitive)

	const changeSensitive = () => {
		setSensitive((current) => !current)
	}

	return (
		<div style={{ display: 'flex', flexWrap: 'wrap' }}>
			<AttachmentBox attachments={props.attachments} openMedia={props.openMedia} sensitive={sensitive} changeSensitive={changeSensitive} columnWidth={props.columnWidth} />
		</div>
	)
}

type AttachmentBoxProps = {
	attachments: Array<Entity.Attachment>
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	changeSensitive: () => void
	sensitive: boolean
	columnWidth: number
}

function AttachmentBox(props: AttachmentBoxProps) {
	const [max, setMax] = useState(1)
	const [remains, setRemains] = useState(0)

	useEffect(() => {
		let m = 1
		if (props.columnWidth >= 420) m = 2
		setMax(m)
		const length = props.attachments.length
		setRemains(length - m)
	}, [props.attachments, props.columnWidth])

	return (
		<>
			<div style={{ display: 'flex' }}>
				{props.attachments
					.filter((_, index) => index < max)
					.map((media, index) => (
						<div key={media.id} style={{ margin: '4px' }}>
							<Attachment media={media} sensitive={props.sensitive} changeSensitive={props.changeSensitive} openMedia={() => props.openMedia(props.attachments, index)} />
						</div>
					))}
				{remains > 0 && (
					<div style={{ position: 'relative', margin: '4px', overflow: 'hidden' }}>
						<div
							style={{
								position: 'absolute',
								top: '50%',
								left: '50%',
								transform: 'translate(-50%, -50%)',
								fontSize: '1.4em',
								cursor: 'pointer',
							}}
						>
							+{remains}
						</div>
						<Image
							width={62}
							height={128}
							src={failoverImg(null)}
							alt="More attachments"
							title="More attachments"
							onClick={() => props.openMedia(props.attachments, max)}
							style={{ objectFit: 'cover', cursor: 'pointer', borderRadius: '4px' }}
						/>
					</div>
				)}
			</div>
		</>
	)
}

type AttachmentProps = {
	media: Entity.Attachment
	openMedia: (media: Entity.Attachment) => void
	changeSensitive: () => void
	sensitive: boolean
}

const Attachment: React.FC<AttachmentProps> = (props) => {
	const { media, changeSensitive, sensitive } = props

	const externalWindow = async (url: string) => {
		open(url)
	}

	return (
		<div style={{ position: 'relative' }}>
			<IconButton icon={<Icon as={BsEyeSlash} />} size="sm" appearance="subtle" onClick={changeSensitive} style={{ position: 'absolute', top: '4px', left: '4px', zIndex: 2 }} />
			<IconButton icon={<Icon as={BsBoxArrowUpRight} />} size="sm" appearance="subtle" onClick={() => externalWindow(media.url)} style={{ position: 'absolute', top: '4px', right: '4px' }} />
			{(media.type === 'gifv' || media.type === 'video') && (
				<IconButton icon={<Icon as={BsCaretRightFill} />} circle onClick={() => props.openMedia(media)} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
			)}
			{media.type === 'audio' && (
				<IconButton icon={<Icon as={BsVolumeUp} />} circle onClick={() => props.openMedia(media)} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
			)}

			{sensitive ?
				<>
					{media.blurhash ? <Blurhash
						hash={media.blurhash ? media.blurhash : ''}
						width={128}
						height={128}
						resolutionX={32}
						resolutionY={32}
						punch={1}
					/> : <div style={{ width: 128, height: 128, backgroundColor: '#f0f0f0', justifyContent: 'center', display: 'flex', alignItems: 'center' }}>
						<div style={{ color: 'black', fontSize: '1.2rem' }}>CW</div>
					</div>}
				</> :
				<Image
					width={128}
					height={128}
					src={previewImage(media)}
					alt={media.description ? media.description : media.id}
					title={media.description ? media.description : media.id}
					onClick={() => props.openMedia(media)}
					style={{ objectFit: 'cover', cursor: 'pointer' }}
				/>}
		</div>
	)
}

const previewImage = (media: Entity.Attachment) => {
	if (media.preview_url && media.preview_url.length > 0) {
		switch (media.type) {
			case 'gifv':
			case 'video':
			case 'audio':
				return failoverImg(null)
			default:
				return media.preview_url
		}
	}
	return failoverImg(null)
}

export default Attachments
