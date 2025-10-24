import { FormattedMessage } from 'react-intl'
import { Radio } from 'rsuite'

type FormBoolean = 'yes' | 'no'
type Props = {
	label: string
	hint?: string
	value: FormBoolean
	onChange: (value: FormBoolean) => void
	fontSize?: string | number
}
function RadioBoolean(props: Props) {
	return (
		<>
			<p style={{ marginTop: 15, marginBottom: 5, fontSize: props.fontSize || 20 }}>{props.label}</p>
			{props.hint && <p style={{ marginBottom: 10 }}>{props.hint}</p>}
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
