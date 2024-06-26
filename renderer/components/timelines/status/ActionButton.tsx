import type { HTMLAttributes, ReactElement } from 'react'
import { IconButton } from 'rsuite'

type Props = {
	icon: ReactElement
	onClick?: () => void
	disabled?: boolean
	className?: string
	activating?: boolean
	deactivating?: boolean
} & HTMLAttributes<HTMLElement>

const ActionButton: React.FC<Props> = (props) => {
	const className = () => {
		if (props.activating) return 'activating'
		if (props.deactivating) return 'deactivating'
		return ''
	}
	return <IconButton appearance="link" className={`${props.className} ${className()}`} icon={props.icon} onClick={props.onClick} disabled={props.disabled} title={props.title} />
}

export default ActionButton
