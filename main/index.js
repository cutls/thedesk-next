"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Native
const path_1 = require("path");
const url_1 = require("url");
const util_1 = require("util");
const child_process_1 = require("child_process");
const promisifyExecFile = (0, util_1.promisify)(child_process_1.execFile);
// Packages
const electron_1 = require("electron");
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const electron_next_1 = __importDefault(require("electron-next"));
// Prepare the renderer once the app is ready
let mainWindow = null;
electron_1.app.on("ready", async () => {
    console.log('start');
    await (0, electron_next_1.default)("./renderer");
    mainWindow = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: (0, path_1.join)(__dirname, "preload.js"),
        },
    });
    const url = electron_is_dev_1.default
        ? "http://localhost:8000/"
        : (0, url_1.format)({
            pathname: (0, path_1.join)(__dirname, "../renderer/out/index.html"),
            protocol: "file:",
            slashes: true,
        });
    mainWindow.loadURL(url);
    electron_1.ipcMain.on("requestInitialInfo", (_event, _message) => {
        mainWindow?.webContents.send('initialInfo', { os: process.platform });
    });
    electron_1.ipcMain.on("requestAppleMusic", async (_event, _message) => {
        console.log((0, path_1.join)(__dirname, "..", "native", "nowplaying-info.js"));
        const { stdout } = await promisifyExecFile((0, path_1.join)(__dirname, "..", "native", "nowplaying-info.js"));
        const song = JSON.parse(stdout);
        if (!song.databaseID)
            return mainWindow?.webContents.send('appleMusic', song);
        try {
            const { stdout: artwork } = await promisifyExecFile((0, path_1.join)(__dirname, "..", "native", "get-artwork"), [song.databaseID.toString()], {
                maxBuffer: 64 * 1024 * 1024,
                encoding: "buffer"
            });
            song.artwork = artwork.toString('base64');
            mainWindow?.webContents.send('appleMusic', song);
        }
        catch {
            mainWindow?.webContents.send('appleMusic', song);
        }
    });
});
electron_1.app.on('second-instance', (_event, commandLine) => {
    if (!mainWindow)
        return;
    const m = commandLine[2].match(/([a-zA-Z0-9]+)\/?\?[a-zA-Z-0-9]+=([^&]+)/);
    if (m) {
        mainWindow.webContents.send('customUrl', [m[1], m[2]]);
    }
});
electron_1.app.on('open-url', function (event, url) {
    if (!mainWindow)
        return;
    event.preventDefault();
    const m = url.match(/([a-zA-Z0-9]+)\/?\?[a-zA-Z-0-9]+=([^&]+)/);
    if (m) {
        mainWindow.webContents.send('customUrl', [m[1], m[2]]);
    }
});
// Quit the app once all windows are closed
electron_1.app.on("window-all-closed", electron_1.app.quit);
// listen the channel `message` and resend the received message to the renderer process
electron_1.ipcMain.on("writeText", (_event, message) => {
    electron_1.clipboard.writeText(message);
});
electron_1.ipcMain.on("openBrowser", (_event, message) => {
    electron_1.shell.openExternal(message);
});
electron_1.app.setAsDefaultProtocolClient('thedesk');
