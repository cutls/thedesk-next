import { open as openBrowser } from '@/utils/openBrowser'
import { useEffect, useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Button, DatePicker, Modal, SelectPicker } from 'rsuite'

export default ({ version }: { version: string }) => {
	const { formatMessage } = useIntl()
	const [newV, setNewV] = useState('')
	const [open, setOpen] = useState(false)
	const [untilMode, setUntilMode] = useState<'date' | 'nextVersion'>('date')
	const [until, setUntil] = useState(new Date())
	const handleOpen = () => setOpen(true)
	const handleClose = () => setOpen(false)
	useEffect(() => {
		const hide = localStorage.getItem('updateHide')
		const hideRule = !!hide
		const isNext = hideRule && !!hide.match(/^[0-9]{1,2}\./)
		if (hideRule && !isNext && Number.parseInt(hide, 10) > new Date().getTime()) return
		const fn = async () => {
			if (!version) return
			const url = 'https://thedesk.top/ver.next.json'
			const api = await fetch(url)
			const json = await api.json()
			const { semanticVersion, version: newVersion } = json
			setNewV(newVersion)
			if (hideRule && isNext && newVersion === hide) return
			if (semanticVersion !== version) handleOpen()
		}
		fn()
	}, [version])
	const update = () => {
		handleClose()
		openBrowser('https://thedesk.top')
	}
	const hide = () => {
		handleClose()
		if (untilMode === 'date') {
			localStorage.setItem('updateHide', until.getTime().toString())
		} else {
			localStorage.setItem('updateHide', newV)
		}
	}

	return (
		<>
			<Modal backdrop="static" keyboard={false} open={open} onClose={handleClose}>
				<Modal.Header>
					<Modal.Title>
						<FormattedMessage id="update.available" />
					</Modal.Title>
				</Modal.Header>

				<Modal.Body>
					<FormattedMessage id="update.update" values={{ version: newV }} />
				</Modal.Body>
				<Modal.Footer>
					<Button onClick={update} appearance="primary">
						<FormattedMessage id="update.ok" />
					</Button>
					<Button onClick={handleClose} appearance="subtle">
						<FormattedMessage id="update.cancel" />
					</Button>
				</Modal.Footer>
				<Modal.Footer>
					<p style={{ textAlign: 'center', marginTop: '15px', marginBottom: '5px' }}>Or more option...</p>
					<div>
						<FormattedMessage id="update.do_not_show" />
						<SelectPicker
							style={{ marginLeft: '3px' }}
							value={untilMode}
							onChange={(e) => setUntilMode(e as any)}
							searchable={false}
							data={[
								{ label: formatMessage({ id: 'update.date' }), value: 'date' },
								{ label: formatMessage({ id: 'update.next_update' }), value: 'nextUpdate' },
							]}
						/>
						{untilMode === 'date' && <DatePicker value={until} onChange={(e) => setUntil(e)} />}{' '}
						<Button onClick={hide} appearance="default">
							<FormattedMessage id="update.hide" />
						</Button>
					</div>
				</Modal.Footer>
			</Modal>
		</>
	)
}
