export type IPCEvent = (ev: { payload: T }) => void
export interface IElectronAPI {
	writeText: (text: string) => void
	requestInitialInfo: (init: boolean) => void
	requestAppleMusic: () => void
	openBrowser: (url: string) => void
	onInitialInfo: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	customUrl: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	appleMusic: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
}

type StreamingArray = [number, WebSocketInterface]
declare global {
	interface Window {
		electronAPI: IElectronAPI
		streamings: StreamingArray[]
		userStreamings: StreamingArray[]
	}
}
