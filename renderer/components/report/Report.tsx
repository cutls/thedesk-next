import alert from '@/components/utils/alert'
import type { Entity, MegalodonInterface } from 'megalodon'
import { useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Loader, Modal, Placeholder, useToaster } from 'rsuite'
import Category from './Category'
import Comment from './Comment'
import Rules from './Rules'
import Statuses from './Statuses'

type Props = {
	opened: boolean
	status: Entity.Status
	client: MegalodonInterface
	close: () => void
}

export default function Report(props: Props) {
	const { formatMessage } = useIntl()
	const [category, setCategory] = useState<Entity.Category | null>(null)
	const [rules, setRules] = useState<Array<string> | null>(null)
	const [statuses, setStatuses] = useState<Array<string> | null>(null)
	const [comment, setComment] = useState<string | null>(null)
	const [_forward, setForward] = useState(true)
	const [sending, setSending] = useState(false)

	const toaster = useToaster()

	const reset = () => {
		setRules(null)
		setCategory(null)
		setStatuses(null)
		setComment(null)
		setForward(true)
		setSending(false)
	}

	const submit = async (category: Entity.Category, rules: Array<string> | null, statuses: Array<string>, comment: string, forward: boolean) => {
		setSending(true)
		try {
			let options = {
				category: category,
				status_ids: statuses,
				comment: comment,
				forward: forward,
			}
			if (rules !== null) {
				options = Object.assign({}, options, {
					rule_ids: rules.map((r) => Number.parseInt(r)),
				})
			}
			await props.client.report(props.status.account.id, options)
		} catch (err) {
			console.error(err)
			toaster.push(alert('error', formatMessage({ id: 'alert.failed_to_report' })), { placement: 'topCenter' })
		} finally {
			setSending(false)
			reset()
			props.close()
		}
	}

	const body = () => {
		if (category === null) {
			return <Category next={(category: Entity.Category) => setCategory(category)} />
		}
		if (rules === null && category === 'violation') {
			return <Rules client={props.client} next={(rules: Array<string>) => setRules(rules)} />
		}
		if (statuses === null) {
			return <Statuses account={props.status.account} client={props.client} next={(statuses: Array<string>) => setStatuses(statuses)} />
		}
		if (comment === null) {
			return (
				<Comment
					next={(comment: string, forward: boolean) => {
						setForward(forward)
						setComment(comment)
						submit(category, rules, statuses, comment, forward)
					}}
				/>
			)
		}
		if (sending) {
			return (
				<>
					<Placeholder.Paragraph rows={3} />
					<Loader center />
				</>
			)
		}
	}

	if (props.status) {
		return (
			<Modal
				size="sm"
				open={props.opened}
				onClose={() => {
					reset()
					props.close()
				}}
			>
				<Modal.Header>
					<FormattedMessage id="report.title" values={{ user: `@${props.status.account.acct}` }} />
				</Modal.Header>
				{body()}
			</Modal>
		)
	}
	return <></>
}
