import { InputNumber } from 'rsuite'

type Props = {
	label: string
	hint?: string
	value: number
	onChange: (value: number) => void
	min?: number
	max?: number
	step?: number
	unit?: string
}
function NumberForm(props: Props) {
	const unitFormat = props.unit ? (value) => `${value}${props.unit}` : undefined
	return (
		<>
			<p style={{ marginTop: 15, marginBottom: 5, fontSize: 20 }}>{props.label}</p>
			{props.hint && <p style={{ marginBottom: 10 }}>{props.hint}</p>}
			<InputNumber min={props.min} max={props.max} step={props.step} value={props.value} onChange={props.onChange} formatter={unitFormat} />
		</>
	)
}
export default NumberForm
