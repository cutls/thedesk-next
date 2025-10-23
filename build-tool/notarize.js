require('dotenv').config()
const { notarize } = require('@electron/notarize')
const useNotarize = true
exports.default = async function notarizing(context) {
	const { electronPlatformName, appOutDir } = context
	if (electronPlatformName !== 'darwin' || !useNotarize) return
	const appName = context.packager.appInfo.productFilename
	console.log(`start notarize: ${appOutDir}/${appName}.app`)
	try {
		return await notarize({
			teamId: process.env.APPLE_TEAM_ID,
			appPath: `${appOutDir}/${appName}.app`,
			appleId: process.env.APPLE_ID,
			appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
			tool: 'notarytool',
		})
	} catch (e) {
		throw console.log(e)
	}
}
