import { getFonts } from 'font-list'
import * as tar from 'tar'
import ntpClient from 'ntp-client'
import { app, clipboard, type IpcMainEvent, nativeImage, shell } from 'electron'
import { ElectronDownloadManager } from 'electron-dl-manager'

import os from 'node:os'
import { join } from 'node:path'

import { auth } from './auth.js'

const defaultConfig: SystemConfig = {
	hardwareAcceleration: true,
	allowDoH: true
}
import fs from 'node:fs'
type SystemConfig = {
	hardwareAcceleration: boolean
	allowDoH: boolean
}
const appDataPath = join(app.getPath('appData'), app.getName())
const configPath = join(appDataPath, 'config.json')
const baseDir = join(appDataPath, 'thedesk-next')
const logger = (msg: string) => {
	console.log(`[TheDesk Main Process] ${msg}`)
	fs.appendFileSync(join(appDataPath, 'main.log'), `[${new Date().toISOString()}] ${msg}\n`)
}
const fetchNewVersion = async (): Promise<number> => {
	const latestRaw = await fetch('https://thedesk.top/fe.next.json')
	const latest = await latestRaw.json()
	const compatibleList = latest[app.getVersion()]
	if (!compatibleList) return 0
	const compatible = compatibleList[0]
	const current = JSON.parse(fs.readFileSync(join(appDataPath, 'ver.json')).toString())
	if (compatible.createdAtUnix / 1000 <= current.unix) return 0
	const url = compatible.url
	logger(`Fetching frontend from ${url}`)
	const blobRaw = await fetch(url)
	const blob = await blobRaw.blob()
	const arrayBuffer = await blob.arrayBuffer()
	fs.writeFileSync(join(appDataPath, 'thedesk-next.tar.gz'), Buffer.from(arrayBuffer))
	logger(`Unzipping frontend from ${join(appDataPath, 'thedesk-next.tar.gz')}`)
	await tar.x({
		file: join(appDataPath, 'thedesk-next.tar.gz'),
		cwd: baseDir
	})
	fs.writeFileSync(join(appDataPath, 'ver.json'), JSON.stringify({ ver: app.getVersion(), unix: Math.floor(Date.now() / 1000) }))
	logger(`Completed fetching frontend`)
	return blob.size
}
const manager = new ElectronDownloadManager()
export const ipcMainWindow = (mainWindow: Electron.BrowserWindow | null, ipcMain: Electron.IpcMain) => {
	let firstRun = false
	let config: SystemConfig = defaultConfig
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
	ipcMain.on('fetch', async () => {
		const size = await fetchNewVersion()
		if (size > 0) mainWindow?.webContents.send('fetchFinish', { size })
	})
	ipcMain.on('hardRefresh', async () => {
		mainWindow?.webContents.session.clearCache()
		mainWindow?.webContents.reloadIgnoringCache()
	})
	ipcMain.on('requestInitialInfo', async (_event) => {
		const info = {
			os: process.platform,
			arch: process.arch,
			lang: app.getPreferredSystemLanguages(),
			version: app.getVersion(),
			fonts: await getFonts({ disableQuoting: true }),
			isFirstRun: firstRun,
			currentRendererAbsolutePath: join(__dirname, '../renderer/out'),
			isStore: process.mas || !!app.getPath('exe').match(/53491Cutls/),
			isMas: !!process.mas,
			isAppx: !!app.getPath('exe').match(/53491Cutls/),
			getPath: app.getPath('exe')
		}
		mainWindow?.webContents.send('initialInfo', info)
	})

	ipcMain.on('imageOperation', async (_event: IpcMainEvent, { image, operation }: { image: string; operation: 'copy' | 'download' }) => {
		if (operation === 'download') return mainWindow?.webContents.downloadURL(image)
		const blob = await fetch(image).then((r) => r.blob())
		const imageNative = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()))
		const type = blob.type
		const isPng = type === 'image/png'
		const obj = isPng ? imageNative.toPNG() : imageNative.toJPEG(100)
		const content = new Electron.ClipboardItem({
			[isPng ? 'image/png' : 'image/jpeg']: new Blob([obj], { type })
		})
		if (operation === 'copy') clipboard.write([content])
	})
	ipcMain.on('openInAppBrowser', async (_event: IpcMainEvent, message: any) => {
		if (!mainWindow) return
		const link = await auth(message, 'thedesk', mainWindow)
		const m = link?.match(/code=([^&]+)/)
		if (m && m[1]) mainWindow?.webContents.send('receiveCode', m[1])
	})
	ipcMain.on('sendCode', (_event: IpcMainEvent, message: any) => mainWindow?.webContents.send('receiveCode', message))
	ipcMain.on('getNtpTime', (_event: IpcMainEvent, server: string) =>
		ntpClient.getNetworkTime(server.split(':')[0], parseInt(server.split(':')[1] || '123', 10), (_err, date) => mainWindow?.webContents.send('currentNtpTime', date?.getTime() || null))
	)
	ipcMain.on('getSystemInfo', (_event: IpcMainEvent) => {
		const info = {
			cpu: os.cpus()[0],
			memory: os.totalmem(),
			freeMemory: os.freemem(),
			uptime: os.uptime()
		}
		mainWindow?.webContents.send('currentSystemInfo', info)
	})
	let downloadId: null | string = null
	ipcMain.on('download', async (_event: IpcMainEvent, url: string) => {
		if (!mainWindow) return
		downloadId = await manager.download({
			window: mainWindow,
			url,
			saveDialogOptions: {
				title: 'Save File'
			},
			callbacks: {
				onDownloadProgress: async ({ id, item, percentCompleted }) => {
					// Send the download progress back to the renderer
					mainWindow?.setProgressBar(percentCompleted / 100)
					mainWindow?.webContents.send('downloadProgress', {
						status: 'downloading',
						id,
						percentCompleted,
						bytesReceived: item.getReceivedBytes()
					})
				},
				onDownloadCompleted: async ({ item }) => {
					mainWindow?.setProgressBar(-1)
					console.log('Download completed:', item.getSavePath())
					shell.showItemInFolder(item.getSavePath())
					app.quit()
				},
				onError: (err, data) => {
					mainWindow?.setProgressBar(-1)

					mainWindow?.webContents.send('downloadProgress', {
						status: 'failed',
						data,
						error: err.message
					})
				}
			}
		})
	})
	ipcMain.on('downloadCancel', () => {
		mainWindow?.setProgressBar(-1)
		if (downloadId) manager.cancelDownload(downloadId)
	})
}
