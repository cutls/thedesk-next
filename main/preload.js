"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
    writeText: (text) => {
        ipcRenderer.send('writeText', text);
    },
    openBrowser: (url) => {
        ipcRenderer.send('openBrowser', url);
    },
    requestInitialInfo: () => {
        ipcRenderer.send('requestInitialInfo');
    },
    requestAppleMusic: () => {
        ipcRenderer.send('requestAppleMusic');
    },
    onInitialInfo: (callback) => {
        ipcRenderer.on('initialInfo', callback);
    },
    appleMusic: (callback) => {
        ipcRenderer.on('appleMusic', callback);
    },
    customUrl: (callback) => {
        ipcRenderer.on('customUrl', callback);
    }
});
