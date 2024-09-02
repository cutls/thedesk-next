import { FormattedMessage } from 'react-intl'
import { Radio, Text } from 'rsuite'

type Props = {
	label: string
	hint?: string
	value: string
	onChange: (value: string) => void
	data: { label: string; value: string }[]
}
function RadioForm({ value, onChange, data, label, hint }: Props) {
	return (
		<>
			<Text style={{ marginTop: 15, marginBottom: 5, fontSize: 20 }}>{label}</Text>
			{hint && <Text style={{ marginBottom: 10 }}>{hint}</Text>}
			{data.map((item) => (
				<Radio key={item.value} checked={value === item.value} onChange={() => onChange(item.value)}>
					<FormattedMessage id={item.label} />
				</Radio>
			))}
		</>
	)
}
export default RadioForm
