import { InputNumber } from "rsuite"

type Props = {
    value: number
    onChange: (value: string) => void
    min?: number
    max?: number
    step?: number
    unit?: string
}
function NumberForm(props: Props) {
    const unitFormat = props.unit ? (value) => `${value}${props.unit}` : undefined
    return <InputNumber min={props.min} max={props.max} step={props.step} value={props.value} onChange={props.onChange} formatter={unitFormat} />
}
export default NumberForm
