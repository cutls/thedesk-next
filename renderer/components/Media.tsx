import { Icon } from '@rsuite/icons'
import type { Entity } from 'megalodon'
import Image from 'next/image'
import { type ReactElement, useCallback, useEffect, useState } from 'react'
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs'
import { Button, FlexboxGrid, Modal } from 'rsuite'
import dynamic from 'next/dynamic'
const Viewer = dynamic(
	() => import('react-viewer'),
	{ ssr: false }
)

type Props = {
	index: number
	media: Array<Entity.Attachment>
	opened: boolean
	close: () => void
}

const Media: React.FC<Props> = (props) => {
	const { media } = props
	const isAllPhoto = media.length && media.every((m) => m && m.type === 'image')
	if (isAllPhoto) {
		const srcs = media.map((m) => {
			return { src: m.url }
		})
		return <Viewer
			onClose={() => props.close()}
			onMaskClick={() => props.close()}
			visible={true}
			images={srcs}
		/>
	}
	const [index, setIndex] = useState<number>(0)

	useEffect(() => {
		setIndex(props.index)
	}, [props.index])

	const next = useCallback(() => {
		if (index >= props.media.length - 1) {
			return
		}
		setIndex((current) => current + 1)
	}, [props.media, index, setIndex])

	const previous = useCallback(() => {
		if (index <= 0) {
			return
		}
		setIndex((current) => current - 1)
	}, [props.media, index, setIndex])

	const handleKeyPress = useCallback(
		(event: KeyboardEvent) => {
			if (props.opened) {
				if (event.key === 'ArrowLeft') {
					previous()
				} else if (event.key === 'ArrowRight') {
					next()
				}
			}
		},
		[props.opened, previous, next],
	)

	useEffect(() => {
		document.addEventListener('keydown', handleKeyPress)

		return () => {
			document.removeEventListener('keydown', handleKeyPress)
		}
	}, [handleKeyPress])

	return (
		<Modal
			open={props.opened}
			size="lg"
			onClose={() => {
				props.close()
				setIndex(0)
			}}
			style={{ height: 'calc(100% - 30px)' }}
			dialogClassName="media-dialog"
		>
			<Modal.Header />
			<Modal.Body style={{ height: '100%' }}>
				<FlexboxGrid style={{ height: '100%' }} align="middle">
					<FlexboxGrid.Item colspan={2}>
						<Button appearance="link" size="lg" disabled={index < 1} onClick={previous}>
							<Icon as={BsChevronLeft} style={{ fontSize: '1.5em' }} />
						</Button>
					</FlexboxGrid.Item>
					<FlexboxGrid.Item colspan={20} style={{ position: 'relative', height: '100%' }}>
						{props.media[index] && mediaComponent(props.media[index])}
					</FlexboxGrid.Item>
					<FlexboxGrid.Item colspan={2}>
						<Button appearance="link" size="lg" disabled={index >= props.media.length - 1} onClick={next}>
							<Icon as={BsChevronRight} style={{ fontSize: '1.5em' }} />
						</Button>
					</FlexboxGrid.Item>
				</FlexboxGrid>
			</Modal.Body>
		</Modal>
	)
}

const mediaComponent = (media: Entity.Attachment): ReactElement => {
	const externalWindow = async (url: string) => {
		//[tauri]
		//await invoke('open_media', { mediaUrl: url })
	}

	switch (media.type) {
		case 'gifv':
			return (
				<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
					{/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
					<video src={media.url} autoPlay loop style={{ maxWidth: '100%', objectFit: 'contain' }} />
				</div>
			)
		case 'video':
		case 'audio':
			return (
				<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
					{/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
					<video src={media.url} autoPlay loop controls style={{ maxWidth: '100%', objectFit: 'contain' }} />
				</div>
			)
		default:
			return (
				<Image
					src={media.url}
					fill
					alt={media.description ? media.description : media.id}
					title={media.description ? media.description : media.id}
					style={{ objectFit: 'contain', cursor: 'pointer' }}
					onClick={() => externalWindow(media.url)}
				/>
			)
	}
}

export default Media
