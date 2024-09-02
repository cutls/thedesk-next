import { SelectPicker, Text } from 'rsuite'

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
	return <>
		<Text style={{ marginTop: 15, marginBottom: 5, fontSize: 20 }}>{props.label}</Text>
		{props.hint && <Text style={{ marginBottom: 10 }}>{props.hint}</Text>}
		<SelectPicker style={props.style} searchable={props.searchable} value={props.value} onChange={props.onChange} data={props.data} />
	</>
}
export default Select
