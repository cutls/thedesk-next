import { FormattedMessage } from 'react-intl'
import { Radio } from 'rsuite'

type FormBoolean = 'yes' | 'no'
type Props = {
	value: FormBoolean
	onChange: (value: FormBoolean) => void
}
function RadioBoolean(props: Props) {
	return (
		<>
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
