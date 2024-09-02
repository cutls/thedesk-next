import { FormattedMessage } from 'react-intl'
import { Radio } from 'rsuite'

type Props = {
	value: string
	onChange: (value: string) => void
	data: { label: string; value: string }[]
}
function RadioForm({ value, onChange, data }: Props) {
	return (
		<>
			{data.map((item) => (
				<Radio key={item.value} checked={value === item.value} onChange={() => onChange(item.value)}>
					<FormattedMessage id={item.label} />
				</Radio>
			))}
		</>
	)
}
export default RadioForm
