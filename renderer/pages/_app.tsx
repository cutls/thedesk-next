import type { AppProps } from 'next/app'

import '../style.css'
import '../App.scss'

import { useEffect } from 'react'
import { TheDeskProviderWrapper } from '@/context'
import { IntlProviderWrapper } from '@/i18n'
import { RsuiteProviderWrapper } from '@/theme'

// This default export is required in a new `pages/_app.js` file.
export default function MyApp({ Component, pageProps }: AppProps) {
	return (
		<TheDeskProviderWrapper>
			<RsuiteProviderWrapper>
				<IntlProviderWrapper>
					<Component {...pageProps} />
				</IntlProviderWrapper>
			</RsuiteProviderWrapper>
		</TheDeskProviderWrapper>
	)
}
