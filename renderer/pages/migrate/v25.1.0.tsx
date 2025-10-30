import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { Loader } from 'rsuite'

function App() {
	const router = useRouter()
	const params = useSearchParams()
	const servers = params.get('servers')
	const accounts = params.get('accounts')
	const timelinesV2 = params.get('timelinesV2')
	useEffect(() => {
		if (servers && servers !== 'null') localStorage.setItem('servers', servers)
		if (accounts && accounts !== 'null') localStorage.setItem('accounts', accounts)
		if (timelinesV2 && timelinesV2 !== 'null') localStorage.setItem('timelinesV2', timelinesV2)
		router.replace('/')
	}, [servers, accounts, timelinesV2])

	return (
		<div>
			<Loader style={{ margin: '5em auto' }} />
		</div>
	)
}
export default App
