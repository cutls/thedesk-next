

export type IPCEvent = (ev: { payload: T }) => void
export interface IElectronAPI {
	writeText: (text: string) => void
	requestInitialInfo: (init: boolean) => void
	openBrowser: (url: string) => void
	openInAppBrowser: (url: string) => void
	onInitialInfo: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	showAbout: (callback: (event: Electron.IpcRendererEvent) => void) => void
	onWindowBlur: (callback: () => void) => () => void
	customUrl: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	openAppDataFolder: () => void
	imageOperation: (image: string, operation: 'copy' | 'download') => void
	fetch: () => void
	fetchFinish: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	hardRefresh: () => void
	sendCode: (code: string) => void
	receiveCode: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	getNtpTime: (server: string) => void
	currentNtpTime: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	getSystemInfo: () => void
	currentSystemInfo: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	download: (url: string) => void
	downloadProgress: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	downloadCancel: () => void
}

type StreamingArray = [number, WebSocketInterface, string, string?]
declare global {
	interface Window {
		electronAPI: IElectronAPI
		streamings: StreamingArray[]
		userStreamings: StreamingArray[]
		settingAudio: HTMLAudioElement
		onAutoCompleteTextarea: boolean
	}
}
