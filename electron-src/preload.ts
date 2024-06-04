const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  on: (channel: string, callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
    ipcRenderer.on(channel, callback);
  },
  removeListener: (channel: string, callback: (event: Electron.IpcRendererEvent, data: any) => void) => {
    ipcRenderer.removeListener(channel, callback);
  }
});
export {}
