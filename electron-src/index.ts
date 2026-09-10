import serve from 'electron-serve'
import fs from 'node:fs'
// Native
import { join } from 'node:path'

type SystemConfig = {
	hardwareAcceleration: boolean
	allowDoH: boolean
}

// Packages
import { app, BrowserWindow, clipboard, type IpcMainEvent, ipcMain, Menu, type MenuItemConstructorOptions, shell } from 'electron'
import isDev from 'electron-is-dev'
const defaultConfig: SystemConfig = {
	hardwareAcceleration: true,
	allowDoH: true
}

import type { WindowState } from './types.js'
import { writePos } from './utils/writePos.js'
import { copyDir } from './utils/copyDir.js'
import { ipcMainWindow } from './utils/ipcMainWindow.js'

const appDataPath = join(app.getPath('appData'), app.getName())
const baseDir = join(appDataPath, 'thedesk-next')
const appServe = app.isPackaged
	? serve({
			directory: baseDir
		})
	: null
// Prepare the renderer once the app is ready
let mainWindow: BrowserWindow | null = null
let config: SystemConfig = defaultConfig
const windowStatePath = join(appDataPath, 'window-state.json')
const isJa = app.getPreferredSystemLanguages().findIndex((e) => !!e.match('ja')) >= 0
const isMac = process.platform === 'darwin'

const template: MenuItemConstructorOptions[] = [
	{
		role: 'fileMenu',
		submenu: [
			{ role: isMac ? 'close' : 'quit' },
			{ label: isJa ? '設定' : 'Prefrences', click: () => mainWindow?.loadURL('app://-/setting.html'), icon: '', accelerator: isMac ? undefined : 'Control+,' }
		]
	},
	{ role: 'editMenu' },
	{ role: 'viewMenu' },
	{ role: 'windowMenu' }
]
const appMenu: MenuItemConstructorOptions = {
	role: 'appMenu',
	submenu: [
		{ label: isJa ? 'TheDeskについて' : 'About TheDesk', click: () => mainWindow?.webContents.send('showAbout') },
		{ type: 'separator' },
		{ label: isJa ? '設定' : 'Prefrences', click: () => mainWindow?.loadURL('app://-/setting.html'), accelerator: isMac ? 'Command+,' : undefined },
		{ type: 'separator' },
		{ role: 'services' },
		{ type: 'separator' },
		{ role: 'hide' },
		{ role: 'hideOthers' },
		{ role: 'unhide' },
		{ type: 'separator' },
		{ role: 'quit' }
	]
}
if (isMac) template.unshift(appMenu)
app.on('ready', async () => {
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
		const mv = () => {
			copyDir(join(__dirname, '../renderer/out'), baseDir)
			fs.writeFileSync(join(appDataPath, 'ver.json'), JSON.stringify({ ver: app.getVersion(), unix: Math.floor(Date.now() / 1000) }))
		}
		if (!fs.existsSync(baseDir)) {
			if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true })
			mv()
		} else {
			const verPath = join(appDataPath, 'ver.json')
			const { ver } = JSON.parse(fs.readFileSync(verPath).toString())
			if (ver !== app.getVersion()) mv()
		}
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

	const menu = Menu.buildFromTemplate(template)
	Menu.setApplicationMenu(menu)
	mainWindow.on('maximize', () => writePos(mainWindow))
	mainWindow.on('unmaximize', () => writePos(mainWindow))
	mainWindow.on('resized', () => writePos(mainWindow))
	mainWindow.on('moved', () => writePos(mainWindow))
	mainWindow.on('minimize', () => writePos(mainWindow))
	mainWindow.on('blur', () => mainWindow?.webContents.send('windowBlur'))
	ipcMainWindow(mainWindow, ipcMain)
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
			inputMenu.popup({
				frame: props.frame || undefined
			})
		} else if (selectionText && selectionText.trim() !== '') {
			const isJa = app.getPreferredSystemLanguages().findIndex((e) => !!e.match('ja')) >= 0
			const selectionMenu = Menu.buildFromTemplate([
				{ role: 'copy' },
				{ type: 'separator' },
				{ role: 'selectAll' },
				{ label: isJa ? `Googleで「${selectionText}」を検索` : `Search "${selectionText}" with Google`, click: () => shell.openExternal(`https://www.google.com/search?q=${selectionText}`) }
			])
			selectionMenu.popup({
				frame: props.frame || undefined
			})
		}
	})
	if (isDev) {
		mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
			{
				urls: ['<all_urls>'],
				types: ['xhr', 'image']
			},
			(detail, cb) => cb({ requestHeaders: Object.assign(detail.requestHeaders, { Referer: undefined }) })
		)
	}
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
	if (m) mainWindow.webContents.send('customUrl', [m[1], m[2]])
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
