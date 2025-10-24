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
			appPath: `${appOutDir}/${appName}.app`,
			appleApiKey: process.env.APPLE_PATH_TO_P8,
			appleApiIssuer: process.env.APPLE_ISSUER_ID
		})
	} catch (e) {
		throw console.log(e)
	}
}
