import type { Entity } from '@cutls/megalodon'
import { Icon } from '@rsuite/icons'
import Image from 'next/image'
import { useContext, useState } from 'react'
import { Blurhash } from 'react-blurhash'
import { BsBoxArrowUpRight, BsCaretRightFill, BsEyeSlash, BsVolumeUp } from 'react-icons/bs'
import { IconButton } from 'rsuite'
import { TheDeskContext } from '@/context'
import failoverImg from '@/utils/failoverImg'
import { openInBrowser } from '@/utils/openBrowser'

type Props = {
	attachments: Array<Entity.Attachment>
	sensitive: boolean
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	columnWidth: number
}

const Attachments: React.FC<Props> = (props) => {
	const [sensitive, setSensitive] = useState<boolean>(props.sensitive)
	const { timelineConfig } = useContext(TheDeskContext)
	const changeSensitive = () => {
		setSensitive((current) => !current)
	}

	return (
		<div style={{ display: 'flex', flexWrap: 'wrap' }}>
			<AttachmentBox attachments={props.attachments} changeSensitive={changeSensitive} openMedia={props.openMedia} sensitive={sensitive} cropImage={timelineConfig.cropImage} columnWidth={props.columnWidth} />
		</div>
	)
}

type AttachmentBoxProps = {
	attachments: Array<Entity.Attachment>
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	changeSensitive: () => void
	cropImage: 'cover' | 'contain'
	sensitive: boolean
	columnWidth: number
}

function AttachmentBox(props: AttachmentBoxProps) {
	const attachments = props.attachments
	const imageWidth = (props.columnWidth - 80) / attachments.length

	return (
		<div style={{ display: 'flex' }}>
			{attachments.map((media, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: <standard reason>
				<div key={media.id + index} style={{ margin: '1px', width: imageWidth }}>
					<Attachment media={media} changeSensitive={props.changeSensitive} width={imageWidth} sensitive={props.sensitive} cropImage={props.cropImage} openMedia={() => props.openMedia(attachments, index)} />
				</div>
			))}
		</div>
	)
}

type AttachmentProps = {
	media: Entity.Attachment
	openMedia: (media: Entity.Attachment) => void
	changeSensitive: () => void
	cropImage: 'cover' | 'contain'
	sensitive: boolean
	width?: number
}

const Attachment: React.FC<AttachmentProps> = (props) => {
	const { media, cropImage, changeSensitive, sensitive, width } = props
	const externalWindow = async (url: string) => {
		openInBrowser(url)
	}
	const border = cropImage === 'contain' ? { backgroundColor: '#000' } : {}

	if (media.type === 'audio') {
		return (
			<div style={{ position: 'relative', display: 'flex' }}>
				<audio src={media.url} controls={true} style={{ width: width || 128, height: 32, ...border }} />
			</div>
		)
	}

	return (
		<div style={{ position: 'relative' }}>
			<IconButton icon={<Icon as={BsEyeSlash} />} size="sm" appearance="subtle" onClick={changeSensitive} style={{ position: 'absolute', bottom: '4px', right: '4px', zIndex: 2 }} />
			<IconButton icon={<Icon as={BsBoxArrowUpRight} />} size="sm" appearance="subtle" onClick={() => externalWindow(media.url)} style={{ position: 'absolute', top: '4px', right: '4px' }} />
			{(media.type === 'gifv' || media.type === 'video') && (
				<IconButton icon={<Icon as={BsCaretRightFill} />} circle onClick={() => props.openMedia(media)} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
			)}

			{sensitive ? (
				media.blurhash ? (
					<Blurhash hash={media.blurhash ? media.blurhash : ''} width={width || 128} height={128} resolutionX={32} resolutionY={32} punch={1} />
				) : (
					<div style={{ width: width || 128, height: 128, overflow: 'hidden', ...border }}>
						<Image
							width={width || 128}
							height={128}
							src={previewImage(media)}
							alt={media.description ? media.description : media.id}
							title={media.description ? media.description : media.id}
							onClick={() => props.openMedia(media)}
							style={{ objectFit: cropImage, cursor: 'pointer', filter: 'blur(5px)' }}
						/>
					</div>
				)
			) : (
				<Image
					width={width || 128}
					height={128}
					src={previewImage(media)}
					alt={media.description ? media.description : media.id}
					title={media.description ? media.description : media.id}
					onClick={() => props.openMedia(media)}
					style={{ objectFit: cropImage, cursor: 'pointer', ...border }}
				/>
			)}
		</div>
	)
}

const previewImage = (media: Entity.Attachment) => {
	if (media.preview_url && media.preview_url.length > 0) {
		switch (media.type) {
			case 'gifv':
			case 'video':
			case 'audio':
				return failoverImg(media.preview_url || null)
			default:
				return media.preview_url
		}
	}
	return failoverImg(null)
}

export default Attachments
