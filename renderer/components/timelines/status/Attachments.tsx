import type { Entity } from '@cutls/megalodon'
import { Icon } from '@rsuite/icons'
import Image from 'next/image'
import { useContext, useEffect, useState } from 'react'
import { Blurhash } from 'react-blurhash'
import { BsBoxArrowUpRight, BsCaretRightFill, BsEyeSlash, BsVolumeUp } from 'react-icons/bs'
import { FormattedMessage } from 'react-intl'
import { Button, IconButton } from 'rsuite'
import { TheDeskContext } from '@/context'
import { defaultSetting, Settings } from '@/entities/settings'
import type { ColumnWidth } from '@/entities/timeline'
import failoverImg from '@/utils/failoverImg'
import { open } from '@/utils/openBrowser'
import { readSettings } from '@/utils/storage'

type Props = {
	attachments: Array<Entity.Attachment>
	sensitive: boolean
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
	columnWidth: number
}

const Attachments: React.FC<Props> = (props) => {
	const [sensitive, setSensitive] = useState<boolean>(props.sensitive)
	const { timelineConfig } = useContext(TheDeskContext)

	return (
		<div style={{ display: 'flex', flexWrap: 'wrap' }}>
			<AttachmentBox attachments={props.attachments} openMedia={props.openMedia} sensitive={sensitive} cropImage={timelineConfig.cropImage} columnWidth={props.columnWidth} />
		</div>
	)
}

type AttachmentBoxProps = {
	attachments: Array<Entity.Attachment>
	openMedia: (media: Array<Entity.Attachment>, index: number) => void
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
				// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
				<div key={media.id + index} style={{ margin: '1px', width: imageWidth }}>
					<Attachment media={media} width={imageWidth} sensitive={props.sensitive} cropImage={props.cropImage} openMedia={() => props.openMedia(attachments, index)} />
				</div>
			))}
		</div>
	)
}

type AttachmentProps = {
	media: Entity.Attachment
	openMedia: (media: Entity.Attachment) => void
	cropImage: 'cover' | 'contain'
	sensitive: boolean
	width?: number
}

const Attachment: React.FC<AttachmentProps> = (props) => {
	const { media, cropImage, sensitive, width } = props
	const externalWindow = async (url: string) => {
		open(url)
	}

	return (
		<div style={{ position: 'relative' }}>
			<IconButton icon={<Icon as={BsBoxArrowUpRight} />} size="sm" appearance="subtle" onClick={() => externalWindow(media.url)} style={{ position: 'absolute', top: '4px', right: '4px' }} />
			{(media.type === 'gifv' || media.type === 'video') && (
				<IconButton icon={<Icon as={BsCaretRightFill} />} circle onClick={() => props.openMedia(media)} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
			)}
			{media.type === 'audio' && (
				<IconButton icon={<Icon as={BsVolumeUp} />} circle onClick={() => props.openMedia(media)} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
			)}

			{sensitive ? (
				media.blurhash ? (
					<Blurhash hash={media.blurhash ? media.blurhash : ''} width={width || 128} height={128} resolutionX={32} resolutionY={32} punch={1} />
				) : (
					<div style={{ width: width || 128, height: 128, overflow: 'hidden' }}>
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
					style={{ objectFit: cropImage, cursor: 'pointer' }}
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
				return failoverImg(null)
			default:
				return media.preview_url
		}
	}
	return failoverImg(null)
}

export default Attachments
