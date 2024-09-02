import { open } from '@/utils/openBrowser'
import { Icon } from '@rsuite/icons'
import Image from 'next/image'
import { BsGithub } from 'react-icons/bs'
import { FormattedMessage } from 'react-intl'
import { Button, FlexboxGrid, Heading, List, Modal } from 'rsuite'
import desk from '../../../assets/desk.png'
import { packages, thirdparty } from '../../thirdparty'

type Props = {
	open: boolean
	onClose: () => void
}

const Thirdparty: React.FC<Props> = (props) => {
	return (
		<Modal backdrop="static" keyboard={true} open={props.open} onClose={props.onClose}>
			<Modal.Header>
				<Heading>
					<FormattedMessage id="settings.thirdparty.title" />
				</Heading>
			</Modal.Header>
			<Modal.Body>
				<Heading as="h4">About</Heading>
				<FlexboxGrid style={{ flexDirection: 'column', alignContent: 'center' }}>
					<Image src={desk} alt="" width={200} />
				</FlexboxGrid>
				<Heading as="h2" style={{ textAlign: 'center', marginTop: '15px' }}>
					TheDesk
				</Heading>
				<p style={{ textAlign: 'center', marginTop: '15px' }}>
					Version: {packages.version}({packages.codename})
				</p>
				<p style={{ textAlign: 'center' }}>© cutls 2024</p>
				<p style={{ textAlign: 'center' }}>
					Strongly powered by{' '}
					<Button startIcon={<Image src="https://fedistar.net/favicon/favicon.ico" alt="fedistar" width={20} height={20} />} onClick={() => open('https://fedistar.net/')}>
						Fedistar (© 2023 Akira Fukushima)
					</Button>
				</p>
				<p style={{ textAlign: 'center' }}>
					TheDesk (including Fedistar) is licensed under GPL-3.{' '}
					<Button startIcon={<Icon as={BsGithub} />} onClick={() => open('https://github.com/cutls/thedesk-next')}>
						Source code
					</Button>
				</p>

				<div style={{ height: '45px' }} />
				<Heading as="h4">LICENSE</Heading>
				<List style={{ margin: '0 8px', backgroundColor: 'var(--rs-border-secondary)', padding: '15px' }}>
					{thirdparty.map((l, index) => (
						<List.Item
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								backgroundColor: 'var(--rs-border-secondary)',
								boxShadow: '0 -1px 0 var(--rs-border-primary),0 1px 0 var(--rs-border-primary)',
							}}
							key={l.package_name}
						>
							<div style={{ paddingRight: '12px' }}>{l.package_name}</div>
							<div style={{ paddingRight: '0' }}>{l.license}</div>
						</List.Item>
					))}
				</List>
			</Modal.Body>
		</Modal>
	)
}

export default Thirdparty
