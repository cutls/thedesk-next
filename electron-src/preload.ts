const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
	writeText: (text: string) => {
		ipcRenderer.send('writeText', text)
	},
	openBrowser: (url: string) => {
		ipcRenderer.send('openBrowser', url)
	},
	requestInitialInfo: (init: boolean) => {
		ipcRenderer.send('requestInitialInfo', init)
	},
	requestAppleMusic: () => {
		ipcRenderer.send('requestAppleMusic')
	},
	onInitialInfo: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
		ipcRenderer.on('initialInfo', callback)
	},

	appleMusic: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
		ipcRenderer.on('appleMusic', callback)
	},
	customUrl: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
		ipcRenderer.on('customUrl', callback)
	},
})
export type {}
