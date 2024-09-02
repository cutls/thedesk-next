import { SelectPicker } from 'rsuite'

type Props = {
	value: string
	onChange: (value: string) => void
	searchable?: boolean
	data: { label: string; value: string }[]
}
function Select(props: Props) {
	return <SelectPicker searchable={props.searchable} value={props.value} onChange={props.onChange} data={props.data} />
}
export default Select
