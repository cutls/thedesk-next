const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
	writeText: (text: string) => ipcRenderer.send('writeText', text),
	openBrowser: (url: string) => ipcRenderer.send('openBrowser', url),
	openInAppBrowser: (url: string) => ipcRenderer.send('openInAppBrowser', url),
	openAppDataFolder: () => ipcRenderer.send('openAppDataFolder'),
	requestInitialInfo: (init: boolean) => ipcRenderer.send('requestInitialInfo', init),
	imageOperation: (image: string, operation: 'copy' | 'download') => {
		ipcRenderer.send('imageOperation', { image, operation })
	},
	fetch: () => ipcRenderer.send('fetch'),
	hardRefresh: () => ipcRenderer.send('hardRefresh'),
	onInitialInfo: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
		ipcRenderer.on('initialInfo', callback)
	},
	showAbout: (callback: (event: Electron.IpcRendererEvent) => void) => {
		ipcRenderer.on('showAbout', callback)
	},
	onWindowBlur: (callback: () => void) => {
		const listener = () => callback()
		ipcRenderer.on('windowBlur', listener)
		return () => ipcRenderer.removeListener('windowBlur', listener)
	},
	appleMusic: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
		ipcRenderer.once('appleMusic', callback)
	},
	customUrl: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
		ipcRenderer.on('customUrl', callback)
	},
	fetchFinish: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
		ipcRenderer.on('fetchFinish', callback)
	},
	sendCode: (code: string) => ipcRenderer.send('sendCode', code),
	receiveCode: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
		ipcRenderer.on('receiveCode', callback)
	},
	getNtpTime: (server: string) => ipcRenderer.send('getNtpTime', server),
	currentNtpTime: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
		ipcRenderer.on('currentNtpTime', callback)
	},
	getSystemInfo: () => ipcRenderer.send('getSystemInfo'),
	currentSystemInfo: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
		ipcRenderer.on('currentSystemInfo', callback)
	},
	download: (url: string) => ipcRenderer.send('download', url),
	downloadCancel: () => ipcRenderer.send('downloadCancel'),
	downloadProgress: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
		ipcRenderer.on('downloadProgress', callback)
	}
})
export type {}
