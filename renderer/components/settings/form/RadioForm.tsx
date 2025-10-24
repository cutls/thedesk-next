import { FormattedMessage } from 'react-intl'
import { Radio } from 'rsuite'

type Props = {
	label: string
	hint?: string
	value: string
	onChange: (value: string) => void
	data: { label: string; value: string }[]
	fontSize?: string | number
}
function RadioForm({ value, onChange, data, label, hint, fontSize }: Props) {
	return (
		<>
			<p style={{ marginTop: 15, marginBottom: 5, fontSize: fontSize || 20 }}>{label}</p>
			{hint && <p style={{ marginBottom: 10 }}>{hint}</p>}
			{data.map((item) => (
				<Radio key={item.value} checked={value === item.value} onChange={() => onChange(item.value)}>
					<FormattedMessage id={item.label} />
				</Radio>
			))}
		</>
	)
}
export default RadioForm
