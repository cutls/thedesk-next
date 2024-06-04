
export type IPCEvent = (ev: { payload: T }) => void
export interface IElectronAPI {
    on: (channel: string, callback: IPCEvent) => void,
    removeListener: (channel: string, callback: IPCEvent) => void
}

declare global {
    interface Window {
        electronAPI: IElectronAPI
    }
}
