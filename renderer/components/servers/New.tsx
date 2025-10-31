import type { OAuth } from '@cutls/megalodon'
import { Icon } from '@rsuite/icons'
import { useContext, useEffect, useState } from 'react'
import { BsClipboard } from 'react-icons/bs'
import { FormattedMessage, useIntl } from 'react-intl'
import { Button, ButtonToolbar, Checkbox, Form, Input, Loader, Modal, Toggle, useToaster } from 'rsuite'
import { TheDeskContext } from '@/context'
import type { Server } from '@/entities/server'
import { parseDomain } from '@/utils/domainParser'
import { addApplication, authorizeCode } from '@/utils/oauth'
import { addServer } from '@/utils/storage'
import alert from '../utils/alert'

type Props = {
	open: boolean
	onClose: () => void
	initialServer: Server | null
}

const New: React.FC<Props> = (props) => {
	const { formatMessage } = useIntl()

	const [server, setServer] = useState<Server>()
	const [app, setApp] = useState<OAuth.AppData>()
	const [loading, setLoading] = useState<boolean>(false)
	const [useAuto, setUseAuto] = useState<boolean>(true)
	const [isElectron, setIsElectron] = useState<boolean>(false)
	const [domain, setDomain] = useState('')
	const [code, setCode] = useState('')
	const { setFocused } = useContext(TheDeskContext)
	const focusAttr = {
		onFocus: () => setFocused(true),
		onBlur: () => setFocused(false)
	}

	const toast = useToaster()

	useEffect(() => {
		setIsElectron(!!window.electronAPI)
		if (props.initialServer) {
			setServer(props.initialServer)
			setDomain(props.initialServer.domain)
		}
	}, [props.initialServer])

	async function addServerFn() {
		setLoading(true)
		try {
			const d = parseDomain(domain)
			const res = await addServer({ domain: d })
			setServer(res)
		} catch (err) {
			console.error(err)
			toast.push(alert('error', formatMessage({ id: 'alert.failed_add_server' }, { domain: domain })), { placement: 'topCenter' })
		} finally {
			setLoading(false)
		}
	}

	async function addApplicationFn() {
		setLoading(true)
		try {
			const redirectUrl = useAuto ? 'thedesk://login' : 'urn:ietf:wg:oauth:2.0:oob'
			const res = await addApplication({ url: server.base_url, redirectUrl })
			setApp(res)
			if (window.electronAPI) window.electronAPI.customUrl(async (_, data) => {
				if (data[0] === 'login') {
					const useCode = data[1]
					try {
						await authorizeCode({ server: server, app: res, code: useCode })
						finish()
					} catch (err) {
						console.error(err)
						toast.push(alert('error', formatMessage({ id: 'alert.failed_authorize' })), { placement: 'topCenter' })
					} finally {
						setLoading(false)
					}
				}
			})
		} catch (err) {
			console.error(err)
			toast.push(alert('error', formatMessage({ id: 'alert.failed_add_application' })), { placement: 'topCenter' })
		} finally {
			setLoading(false)
		}
	}

	async function authorizeCodeFn() {
		setLoading(true)
		try {
			await authorizeCode({ server: server, app: app, code: code })
			finish()
		} catch (err) {
			console.error(err)
			toast.push(alert('error', formatMessage({ id: 'alert.failed_authorize' })), { placement: 'topCenter' })
		} finally {
			setLoading(false)
		}
	}

	const clear = () => {
		setServer(undefined)
		setApp(undefined)
		setLoading(false)
		setDomain('')
		setCode('')
	}

	const finish = async () => {
		location.reload()
		//await invoke('init_instruction')
	}

	const close = () => {
		clear()
		props.onClose()
	}

	const copyText = (text: string) => {
		navigator.clipboard.writeText(text)
	}

	return (
		<Modal backdrop="static" keyboard={true} open={props.open} onClose={() => close()}>
			<Modal.Header>
				<Modal.Title>
					<FormattedMessage id="servers.new.title" />
				</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				{server === undefined && (
					<Form fluid formValue={{ domain: domain }} onChange={(o) => setDomain(o.domain)}>
						<Form.Group>
							<Form.ControlLabel>
								<FormattedMessage id="servers.new.domain" />
							</Form.ControlLabel>
							<Form.Control {...focusAttr} name="domain" placeholder="mastodon.social" />
						</Form.Group>
						<Form.Group>
							<ButtonToolbar>
								<Button appearance="primary" onClick={() => addServerFn()}>
									<FormattedMessage id="servers.new.add" />
								</Button>
								<Button appearance="link" onClick={() => close()}>
									<FormattedMessage id="servers.new.cancel" />
								</Button>
							</ButtonToolbar>
						</Form.Group>
					</Form>
				)}
				{server !== undefined && app === undefined && (
					<Form fluid>
						<Form.Group>
							<p>
								<FormattedMessage id="servers.new.server_description" />
							</p>
						</Form.Group>
						<Form.Group>
							<Input value={domain} {...focusAttr} readOnly />
						</Form.Group>
						{isElectron && <Checkbox style={{ marginBottom: '5px' }} checked={useAuto} value="useAuto" onChange={() => setUseAuto(!useAuto)}>
							<FormattedMessage id="servers.new.auto_login" />
						</Checkbox>}

						<Form.Group>
							<ButtonToolbar>
								<Button appearance="primary" onClick={() => addApplicationFn()}>
									<FormattedMessage id="servers.new.sign_in" />
								</Button>
								<Button appearance="link" onClick={() => finish()}>
									<FormattedMessage id="servers.new.finish" />
								</Button>
							</ButtonToolbar>
						</Form.Group>
					</Form>
				)}
				{app !== undefined && (
					<Form fluid formValue={{ code: code }} onChange={(o) => setCode(o.code)}>
						<p>
							<FormattedMessage id="servers.new.authorization_url" />
						</p>
						<div
							style={{
								backgroundColor: 'var(--rs-gray-800)',
								width: '80%',
								padding: '8px 0 8px 12px',
								borderRadius: '4px',
								margin: '8px 0',
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center'
							}}
						>
							<span
								className="no-scrollbar"
								style={{
									width: '90%',
									whiteSpace: 'nowrap',
									overflowX: 'auto'
								}}
							>
								{app.url}
							</span>
							<Button appearance="link" onClick={() => copyText(app.url)}>
								<Icon as={BsClipboard} />
							</Button>
						</div>
						{app.session_token ? (
							<div style={{ margin: '1em 0' }}>
								<FormattedMessage id="servers.new.without_code_authorize" />
							</div>
						) : (
							<Form.Group>
								<Form.ControlLabel>
									<FormattedMessage id="servers.new.authorization_code" />
								</Form.ControlLabel>
								<Form.Control {...focusAttr} name="code" />
								<Form.HelpText>
									<FormattedMessage id="servers.new.authorization_help" />
								</Form.HelpText>
							</Form.Group>
						)}
						<Form.Group>
							<ButtonToolbar>
								<Button appearance="primary" onClick={() => authorizeCodeFn()}>
									<FormattedMessage id="servers.new.authorize" />
								</Button>
								<Button appearance="link" onClick={() => finish()}>
									<FormattedMessage id="servers.new.cancel" />
								</Button>
							</ButtonToolbar>
						</Form.Group>
					</Form>
				)}
				{loading && <Loader center backdrop content={<FormattedMessage id="servers.new.loading" />} />}
			</Modal.Body>
		</Modal>
	)
}

export default New
