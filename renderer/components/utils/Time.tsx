import dayjs from 'dayjs'
// https://github.com/iamkun/dayjs/tree/dev/src/locale
import 'dayjs/locale/ja'
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'
import { useContext, type HTMLAttributes } from 'react'
import { TheDeskContext } from '@/context'

type Props = {
	time: string
	onClick?: (e: any) => void
} & HTMLAttributes<HTMLElement>

const parseDatetime = (timestamp: string) => {
	dayjs.extend(updateLocale)
	dayjs.updateLocale('en', {
		relativeTime: {
			future: 'in %s',
			past: '%s ago',
			s: 'now',
			m: '%ds',
			mm: '%dm',
			h: '%dm',
			hh: '%dh',
			d: '%dh',
			dd: '%dd',
			M: 'a month',
			MM: '%d months',
			y: 'a year',
			yy: '%d years',
		},
	})
	dayjs.extend(relativeTime)
	return dayjs(timestamp).fromNow(true)
}

const Time: React.FC<Props> = (props) => {
	const { timelineConfig } = useContext(TheDeskContext)
	const fullday = dayjs(props.time).format('YYYY/M/D H:mm:ss (A h:mm:ss)')
	const absStyle = {...props.style, fontSize: '0.8rem' }
	if ( timelineConfig.time === 'absolute') {
		if (dayjs(props.time).year() !== dayjs().year()) return <time title={fullday} style={absStyle}>{dayjs(props.time).format('YYYY/M/D H:mm')}</time>
		if (dayjs(props.time).month() !== dayjs().month()) return <time title={fullday} style={absStyle}>{dayjs(props.time).format('M/D H:mm')}</time>
		if (dayjs(props.time).date() !== dayjs().date()) return <time title={fullday} style={absStyle}>{dayjs(props.time).format('M/D H:mm')}</time>
		return <time title={fullday} style={absStyle}>{dayjs(props.time).format('H:mm:ss')}</time>
	}
	if ( timelineConfig.time === '12h') {
		if (dayjs(props.time).year() !== dayjs().year()) return <time title={fullday} style={absStyle}>{dayjs(props.time).format('YYYY/M/D A h:mm')}</time>
		if (dayjs(props.time).month() !== dayjs().month()) return <time title={fullday} style={absStyle}>{dayjs(props.time).format('M/D A h:mm')}</time>
		if (dayjs(props.time).date() !== dayjs().date()) return <time title={fullday} style={absStyle}>{dayjs(props.time).format('M/D A h:mm')}</time>
		return <time title={fullday} style={absStyle}>{dayjs(props.time).format('A h:mm:ss')}</time>
	} 
	return (
		<time dateTime={dayjs(props.time).format('YYYY-MM-DD HH:mm:ss')} title={fullday} style={props.style} onClick={props.onClick}>
			{parseDatetime(props.time)}
		</time>
	)
}

export default Time
