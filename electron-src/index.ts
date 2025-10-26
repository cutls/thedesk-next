import fs from 'fs'
// Native
import { join } from 'path'
import { getFonts } from 'font-list'

import { execFile } from 'child_process'
import { promisify } from 'util'
import serve from 'electron-serve'
type SystemConfig = {
	hardwareAcceleration: boolean
	allowDoH: boolean
}

const promisifyExecFile = promisify(execFile)
// Packages
import { BrowserWindow, type IpcMainEvent, Menu, type MenuItemConstructorOptions, app, clipboard, ipcMain, nativeImage, shell, screen } from 'electron'
import isDev from 'electron-is-dev'
import defaultConfig from './defaultConfig.json'
import { WindowState } from './types'
const appServe = app.isPackaged
	? serve({
			directory: join(__dirname, '../renderer/out')
		})
	: null
// Prepare the renderer once the app is ready
let mainWindow: BrowserWindow | null = null
let config: SystemConfig = defaultConfig
const appDataPath = join(app.getPath('appData'), app.getName())
const configPath = join(appDataPath, 'config.json')
const windowStatePath = join(appDataPath, 'window-state.json')
const logger = (msg: string) => {
	console.log(`[TheDesk Main Process] ${msg}`)
	fs.appendFileSync(join(appDataPath, 'main.log'), `[${new Date().toISOString()}] ${msg}\n`)
}
let firstRun = false
try {
	if (!fs.existsSync(appDataPath) || !fs.existsSync(configPath)) {
		fs.writeFileSync(configPath, JSON.stringify(defaultConfig))
		firstRun = true
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
function writePos(mainWindow: Electron.BrowserWindow | null) {
	if (!mainWindow) return
	const size: WindowState = {
		...mainWindow.getBounds(),
		isMaximized: mainWindow.isMaximized(),
		isFullScreen: mainWindow.isFullScreen(),
		displayBounds: screen.getPrimaryDisplay().bounds
	}
	fs.writeFileSync(windowStatePath, JSON.stringify(size))
}
app.on('ready', async () => {
	logger('start')
	if (!config.allowDoH) app.configureHostResolver({ secureDnsMode: 'off' })
	const windowState: WindowState = fs.existsSync(windowStatePath) ? JSON.parse(fs.readFileSync(windowStatePath).toString()) : {}
	mainWindow = new BrowserWindow({
		x: windowState.x || 0,
		y: windowState.y || 0,
		width: windowState.width > 200 ? windowState.width : 800,
		height: windowState.height > 200 ? windowState.height : 600,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: join(__dirname, 'preload.js'),
			webSecurity: isDev ? false : undefined
		}
	})
	if (windowState.isMaximized) mainWindow.maximize()
	if (windowState.isFullScreen) mainWindow.setFullScreen(true)

	if (app.isPackaged && appServe !== null) {
		appServe(mainWindow).then(() => {
			if (mainWindow) mainWindow.loadURL('app://-')
		})
	} else {
		mainWindow.loadURL('http://localhost:3000')
		mainWindow.webContents.openDevTools()
		mainWindow.webContents.on('did-fail-load', () => {
			if (mainWindow) mainWindow.webContents.reloadIgnoringCache()
		})
	}
	const isJa = app.getPreferredSystemLanguages().includes('ja')
	const template: MenuItemConstructorOptions[] = [
		{ role: 'fileMenu', submenu: [{ label: isJa ? '設定' : 'Prefrences', click: () => mainWindow?.loadURL('app://-/setting.html') }] },
		{ role: 'editMenu' },
		{ role: 'viewMenu' },
		{ role: 'windowMenu' }
	]
	if (process.platform === 'darwin') template.unshift({ role: 'appMenu', submenu: [{ label: isJa ? '設定' : 'Prefrences', click: () => mainWindow?.loadURL('app://-/setting.html') }] })
	const menu = Menu.buildFromTemplate(template)
	Menu.setApplicationMenu(menu)
	mainWindow.on('maximize', () => writePos(mainWindow))
	mainWindow.on('unmaximize', () => writePos(mainWindow))
	mainWindow.on('resized', () => writePos(mainWindow))
	mainWindow.on('moved', () => writePos(mainWindow))
	mainWindow.on('minimize', () => writePos(mainWindow))
	ipcMain.on('requestInitialInfo', async (_event) => {
		mainWindow?.webContents.send('initialInfo', {
			os: process.platform,
			lang: app.getPreferredSystemLanguages(),
			version: app.getVersion(),
			fonts: await getFonts({ disableQuoting: true }),
			isFirstRun: firstRun,
			currentRendererAbsolutePath: join(__dirname, '../renderer/out')
		})
	})
	ipcMain.on('requestAppleMusic', async (_event: IpcMainEvent, { fallback }: { fallback: boolean }) => {
		const fromDock = async () => {
			try {
				const { stdout } = await promisifyExecFile(join(__dirname, '..', 'native', 'nowplaying-ctrl.js').replace('app.asar', 'app.asar.unpacked'))
				if (!stdout) return null
				const songRaw = JSON.parse(stdout)
				const song = { type: 'dock', data: songRaw }
				return mainWindow?.webContents.send('appleMusic', song)
			} catch (e) {
				return mainWindow?.webContents.send('appleMusic', { type: 'dock', data: (e as any).stderr?.toString() })
			}
		}
		let song: Record<string, any> = {}
		try {
			const { stdout } = await promisifyExecFile(join(__dirname, '..', 'native', 'nowplaying-info.js').replace('app.asar', 'app.asar.unpacked'))
			if (!stdout && fallback) return await fromDock()
			song = JSON.parse(stdout)
			if ((!song || !song.name) && fallback) return await fromDock()
			if (!song.databaseID) return mainWindow?.webContents.send('appleMusic', song)
		} catch (e: any) {
			if (fallback) return await fromDock()
			return mainWindow?.webContents.send('appleMusic', { error: true, message: 'unknown error' })
		}
		try {
			const { stdout: artwork } = await promisifyExecFile(join(__dirname, '..', 'native', 'get-artwork'), [song.databaseID.toString()], {
				maxBuffer: 64 * 1024 * 1024,
				encoding: 'buffer'
			})
			song.artwork = artwork.toString('base64')
			mainWindow?.webContents.send('appleMusic', song)
		} catch {
			mainWindow?.webContents.send('appleMusic', song)
		}
	})

	ipcMain.on('imageOperation', async (_event: IpcMainEvent, { image, operation }: { image: string; operation: 'copy' | 'download' }) => {
		if (operation === 'download') return mainWindow?.webContents.downloadURL(image)
		const blob = await fetch(image).then((r) => r.blob())
		if (operation === 'copy') clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer())))
	})
	mainWindow.webContents.on('context-menu', (_e, props) => {
		const { selectionText, isEditable } = props
		if (isEditable) {
			const inputMenu = Menu.buildFromTemplate([
				{ role: 'undo' },
				{ role: 'redo' },
				{ type: 'separator' },
				{ role: 'cut' },
				{ role: 'copy' },
				{ role: 'paste' },
				{ type: 'separator' },
				{ role: 'selectAll' }
			])
			inputMenu.popup()
		} else if (selectionText && selectionText.trim() !== '') {
			const isJa = app.getPreferredSystemLanguages().includes('ja')
			const selectionMenu = Menu.buildFromTemplate([
				{ role: 'copy' },
				{ type: 'separator' },
				{ role: 'selectAll' },
				{ label: isJa ? `Googleで「${selectionText}」を検索` : `Search "${selectionText}" with Google`, click: () => shell.openExternal(`https://www.google.com/search?q=${selectionText}`) }
			])
			selectionMenu.popup()
		}
	})
	logger('finished')
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
