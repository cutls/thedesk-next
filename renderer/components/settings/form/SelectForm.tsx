import { SelectPicker } from 'rsuite'

type Props = {
	label: string
	hint?: string
	value: string
	onChange: (value: string) => void
	searchable?: boolean
	data: { label: string; value: string }[]
	style?: React.CSSProperties
}
function Select(props: Props) {
	return (
		<>
			<p style={{ marginTop: 15, marginBottom: 5, fontSize: 20 }}>{props.label}</p>
			{props.hint && <p style={{ marginBottom: 10 }}>{props.hint}</p>}
			<SelectPicker style={props.style} searchable={props.searchable} value={props.value} onChange={props.onChange} data={props.data} />
		</>
	)
}
export default Select
