import { useEffect, useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Button, ButtonToolbar, DatePicker, Message, Modal, Progress, SelectPicker } from 'rsuite'
import { openInBrowser as openBrowser } from '@/utils/openBrowser'

export default ({ version }: { version: string }) => {
	const { formatMessage } = useIntl()
	const [fe, setFe] = useState(false)
	const [newV, setNewV] = useState('')
	const [open, setOpen] = useState(false)
	const [selected, setSelected] = useState('win')
	const [assets, setAssets] = useState<Record<string, { url: string; size: number }>>({})
	const [progress, setProgress] = useState<null | number>(null)
	const [untilMode, setUntilMode] = useState<'date' | 'nextVersion'>('date')
	const [until, setUntil] = useState(new Date())
	const handleOpen = () => setOpen(true)
	const handleClose = () => setOpen(false)
	useEffect(() => {
		const hide = localStorage.getItem('updateHide')
		const hideRule = !!hide
		const isNext = hideRule && !!hide.match(/^[0-9]{1,2}\./)
		if (hideRule && !isNext && Number.parseInt(hide, 10) > Date.now()) return
		const lastSelected = localStorage.getItem('updateSelected')
		if (lastSelected) {
			setSelected(lastSelected)
		} else {
			const os = localStorage.getItem('os')
			const arch = localStorage.getItem('arch')
			if (os === 'win32' && arch === 'x64') setSelected('win')
			else if (os === 'win32' && arch === 'arm64') setSelected('winArm64')
			else if (os === 'darwin') setSelected('mac')
			else if (os === 'linux') setSelected('linuxZip')
		}
		const fn = async () => {
			const isStoreStr = localStorage.getItem('isStore')
			const isStore = isStoreStr === 'true' || !isStoreStr
			if (isStore) return
			if (!version) return
			try {
				const url = 'https://thedesk.top/ver.next.json'
				const api = await fetch(url)
				const json = await api.json()
				const { semanticVersion, version: newVersion, assets } = json
				setNewV(newVersion)
				setAssets(assets)
				if (hideRule && isNext && newVersion === hide) return
				if (semanticVersion !== version) handleOpen()
			} catch {
				console.error('Failed to check for updates')
			}
		}
		fn()
		if (window.electronAPI) window.electronAPI.fetch()
		if (window.electronAPI) window.electronAPI.fetchFinish((_event) => setFe(true))
	}, [version])
	const update = () => {
		localStorage.setItem('updateSelected', selected)
		const url = selected !== 'winArm64' ? (assets[selected] ? assets[selected].url : assets.win.url) : assets[selected].url
		window.electronAPI.download(url)
		window.electronAPI.downloadProgress((_event, data) => {
			if (data.status === 'downloading') setProgress(data.percentCompleted)
			if (data.status === 'failed') setProgress(null)
		})
	}
	const openBrowserHandler = () => {
		openBrowser('https://thedesk.top')
		handleClose()
	}
	const cancel = () => {
		window.electronAPI.downloadCancel()
		handleClose()
	}
	const hide = () => {
		handleClose()
		if (untilMode === 'date') {
			localStorage.setItem('updateHide', until.getTime().toString())
		} else {
			localStorage.setItem('updateHide', newV)
		}
	}
	const toSize = (size: number) => (size ? `(${(size / 1024 / 1024).toFixed(2)} MB)` : '')

	return (
		<>
			<Modal backdrop="static" keyboard={false} open={open} onClose={handleClose}>
				<Modal.Header>
					<Modal.Title>
						<FormattedMessage id="update.available" />
					</Modal.Title>
				</Modal.Header>
				{typeof progress === 'number' ? (
					<Modal.Body>
						<FormattedMessage id="update.updateInProgress" />
						<Progress.Line percent={progress} status="active" />
					</Modal.Body>
				) : (
					<Modal.Body>
						<FormattedMessage id="update.update" values={{ version: newV }} />
					</Modal.Body>
				)}
				<Modal.Footer>
					{typeof progress !== 'number' ? (
						<>
							<Button onClick={openBrowserHandler} appearance="subtle">
								<FormattedMessage id="update.openBrowser" />
							</Button>
							<SelectPicker
								style={{ marginRight: '3px' }}
								cleanable={false}
								value={selected}
								onChange={(e) => setSelected(e as any)}
								searchable={false}
								data={[
									{ label: `Windows(x64) ${toSize(assets.win?.size)}`, value: 'win' },
									{ label: `Windows(arm64) ${toSize(assets.winArm64?.size)}`, value: 'winArm64' },
									{ label: `macOS ${toSize(assets.mac?.size)}`, value: 'mac' },
									{ label: `Linux(zip) ${toSize(assets.linuxZip?.size)}`, value: 'linuxZip' },
									{ label: `Linux(deb) ${toSize(assets.linuxDeb?.size)}`, value: 'linuxDeb' }
								]}
							/>
							<Button onClick={update} appearance="primary">
								<FormattedMessage id="update.ok" />
							</Button>
						</>
					) : (
						<Button onClick={cancel} appearance="subtle">
							<FormattedMessage id="update.cancel" />
						</Button>
					)}
				</Modal.Footer>
				{typeof progress !== 'number' && (
					<Modal.Footer>
						<p style={{ textAlign: 'center', marginTop: '15px', marginBottom: '5px' }}>Or more option...</p>
						<div>
							<FormattedMessage id="update.doNotShow" />
							<SelectPicker
								style={{ marginLeft: '3px' }}
								value={untilMode}
								onChange={(e) => setUntilMode(e as any)}
								searchable={false}
								data={[
									{ label: formatMessage({ id: 'update.date' }), value: 'date' },
									{ label: formatMessage({ id: 'update.nextUpdate' }), value: 'nextUpdate' }
								]}
							/>
							{untilMode === 'date' && <DatePicker value={until} onChange={(e) => setUntil(e)} />}{' '}
							<Button onClick={hide} appearance="default">
								<FormattedMessage id="update.hide" />
							</Button>
						</div>
					</Modal.Footer>
				)}
			</Modal>
			{fe && (
				<Message showIcon type="info" className="fe-info" style={{ position: 'fixed', bottom: '20px', right: '20px', width: '350px', zIndex: 999 }}>
					<FormattedMessage id="update.fe.hint" />
					<ButtonToolbar style={{ marginTop: '10px' }}>
						<Button size="sm" appearance="link" onClick={() => setFe(false)}>
							<FormattedMessage id="update.cancel" />
						</Button>
						<Button size="sm" onClick={() => window.electronAPI.hardRefresh()}>
							<FormattedMessage id="update.fe.refresh" />
						</Button>
					</ButtonToolbar>
				</Message>
			)}
		</>
	)
}
