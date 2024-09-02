import { FormattedMessage } from 'react-intl'
import { Radio, Text } from 'rsuite'

type FormBoolean = 'yes' | 'no'
type Props = {
	label: string
	hint?: string
	value: FormBoolean
	onChange: (value: FormBoolean) => void
}
function RadioBoolean(props: Props) {
	return (
		<>
			
		<Text style={{ marginTop: 15, marginBottom: 5, fontSize: 20 }}>{props.label}</Text>
		{props.hint && <Text style={{ marginBottom: 10 }}>{props.hint}</Text>}
		<Radio checked={props.value === 'yes'} onChange={() => props.onChange('yes')}>
				<FormattedMessage id="timeline.settings.do" />
			</Radio>
			<Radio checked={props.value === 'no'} onChange={() => props.onChange('no')}>
				<FormattedMessage id="timeline.settings.not_do" />
			</Radio>
		</>
	)
}
export default RadioBoolean
