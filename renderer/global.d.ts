export type IPCEvent = (ev: { payload: T }) => void
export interface IElectronAPI {
	writeText: (text: string) => void
	requestInitialInfo: () => void
	requestAppleMusic: () => void
	openBrowser: (url: string) => void
	onInitialInfo: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	customUrl: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	appleMusic: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
}

declare global {
	interface Window {
		electronAPI: IElectronAPI
	}
}
