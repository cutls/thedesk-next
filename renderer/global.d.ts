import type { TimelineKind } from './entities/timeline'

export type IPCEvent = (ev: { payload: T }) => void
export interface IElectronAPI {
	writeText: (text: string) => void
	requestInitialInfo: (init: boolean) => void
	requestAppleMusic: (fallback: boolean) => void
	openBrowser: (url: string) => void
	onInitialInfo: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	customUrl: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	appleMusic: (callback: (event: Electron.IpcRendererEvent, data: any) => void) => void
	openAppDataFolder: () => void
	imageOperation: (image: string, operation: 'copy' | 'download') => void
}

type StreamingArray = [number, WebSocketInterface, string]
declare global {
	interface Window {
		electronAPI: IElectronAPI
		streamings: StreamingArray[]
		userStreamings: StreamingArray[]
	}
}
