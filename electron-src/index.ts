// Native
import { join } from 'path'
import { format } from 'url'
import fs from 'fs'
import { getFonts } from 'font-list'

import { execFile } from 'child_process'
import { promisify } from 'util'
import stateKeeper from 'electron-window-state'
type SystemConfig = {
	hardwareAcceleration: boolean
	allowDoH: boolean
}

const promisifyExecFile = promisify(execFile)
// Packages
import { BrowserWindow, type IpcMainEvent, app, clipboard, ipcMain, shell, Menu } from 'electron'
import isDev from 'electron-is-dev'
import prepareNext from 'electron-next'
import defaultConfig from './defaultConfig.json'
// Prepare the renderer once the app is ready
let mainWindow: BrowserWindow | null = null
const appDataPath = join(app.getPath('appData'), app.getName())
const configPath = join(appDataPath, 'config.json')
let config: SystemConfig = defaultConfig
try {
	if (!fs.existsSync(appDataPath) || !fs.existsSync(configPath)) {
		fs.writeFileSync(configPath, JSON.stringify(defaultConfig))
	} else {
		try {
			const data = fs.readFileSync(configPath)
			config = JSON.parse(data.toString())
			if (!config.hardwareAcceleration) app.disableHardwareAcceleration()
		} catch {
			console.error('config.json is corrupted')
		}
	}
} catch {
	console.error('Failed to read config.json')
}
const selectionMenu = Menu.buildFromTemplate([
	{ role: 'copy' },
	{ type: 'separator' },
	{ role: 'selectAll' }
])

const inputMenu = Menu.buildFromTemplate([
	{ role: 'undo' },
	{ role: 'redo' },
	{ type: 'separator' },
	{ role: 'cut' },
	{ role: 'copy' },
	{ role: 'paste' },
	{ type: 'separator' },
	{ role: 'selectAll' },
])


app.on('ready', async () => {
	console.log('start')
	await prepareNext('./renderer')
	if (!config.allowDoH) app.configureHostResolver({ secureDnsMode: 'off' })
	const windowState = stateKeeper({
		defaultWidth: 800,
		defaultHeight: 600,
	})

	mainWindow = new BrowserWindow({
		x: windowState.x,
		y: windowState.y,
		width: windowState.width,
		height: windowState.height,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: join(__dirname, 'preload.js'),
			webSecurity: isDev ? false : undefined,
		},
	})

	const url = isDev
		? 'http://localhost:8000/'
		: format({
			pathname: join(__dirname, '../renderer/out/index.html'),
			protocol: 'file:',
			slashes: true,
		})

	mainWindow.loadURL(url)
	windowState.manage(mainWindow)
	ipcMain.on('requestInitialInfo', async (_event) => {
		mainWindow?.webContents.send('initialInfo', {
			os: process.platform,
			lang: app.getPreferredSystemLanguages(),
			version: app.getVersion(),
			fonts: await getFonts({ disableQuoting: true })
		})
	})
	ipcMain.on('requestAppleMusic', async (_event: IpcMainEvent, _message: any) => {
		const { stdout } = await promisifyExecFile(join(__dirname, '..', 'native', 'nowplaying-info.js'))
		const song = JSON.parse(stdout)
		if (!song.databaseID) return mainWindow?.webContents.send('appleMusic', song)
		try {
			const { stdout: artwork } = await promisifyExecFile(join(__dirname, '..', 'native', 'get-artwork'), [song.databaseID.toString()], {
				maxBuffer: 64 * 1024 * 1024,
				encoding: 'buffer',
			})
			song.artwork = artwork.toString('base64')
			mainWindow?.webContents.send('appleMusic', song)
		} catch {
			mainWindow?.webContents.send('appleMusic', song)
		}
	})
	mainWindow.webContents.on('context-menu', (_e, props) => {
		const { selectionText, isEditable } = props
		if (isEditable) {
			inputMenu.popup()
		} else if (selectionText && selectionText.trim() !== '') {
			selectionMenu.popup()
		}
	})
})
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
	app.quit()
} else {
	app.on('second-instance', (_event, commandLine) => {
		if (!mainWindow) return
		const m = commandLine[2].match(/([a-zA-Z0-9]+)\/?\?[a-zA-Z-0-9]+=([^&]+)/)
		if (m) {
			mainWindow.webContents.send('customUrl', [m[1], m[2]])
		}
	})
}
app.on('open-url', (event, url) => {
	if (!mainWindow) return
	event.preventDefault()
	const m = url.match(/([a-zA-Z0-9]+)\/?\?[a-zA-Z-0-9]+=([^&]+)/)
	if (m) {
		mainWindow.webContents.send('customUrl', [m[1], m[2]])
	}
})
// Quit the app once all windows are closed
app.on('window-all-closed', app.quit)

// listen the channel `message` and resend the received message to the renderer process
ipcMain.on('writeText', (_event: IpcMainEvent, message: any) => {
	clipboard.writeText(message)
})
ipcMain.on('openBrowser', (_event: IpcMainEvent, message: any) => {
	shell.openExternal(message)
})
ipcMain.on('openAppDataFolder', (_event: IpcMainEvent) => {
	shell.openPath(appDataPath)
})
app.setAsDefaultProtocolClient('thedesk')
