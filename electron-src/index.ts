// Native
import { join } from "path";
import { format } from "url";

import { promisify } from "util";
import { execFile } from "child_process";
const promisifyExecFile = promisify(execFile)

// Packages
import { BrowserWindow, app, ipcMain, IpcMainEvent, shell, clipboard } from "electron";
import isDev from "electron-is-dev";
import prepareNext from "electron-next";
// Prepare the renderer once the app is ready
let mainWindow: BrowserWindow | null = null
app.on("ready", async () => {
  console.log('start')
  await prepareNext("./renderer");

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, "preload.js"),
    },
  });

  const url = isDev
    ? "http://localhost:8000/"
    : format({
      pathname: join(__dirname, "../renderer/out/index.html"),
      protocol: "file:",
      slashes: true,
    });

  mainWindow.loadURL(url);
  ipcMain.on("requestInitialInfo", (_event: IpcMainEvent, _message: any) => {
    mainWindow?.webContents.send('initialInfo', { os: process.platform });
  });
  ipcMain.on("requestAppleMusic", async (_event: IpcMainEvent, _message: any) => {
    console.log(join(__dirname, "..", "native", "nowplaying-info.js"))
    const { stdout } = await promisifyExecFile(join(__dirname, "..", "native", "nowplaying-info.js"))
    const song = JSON.parse(stdout)
    if (!song.databaseID) return mainWindow?.webContents.send('appleMusic', song)
    try {
      const { stdout: artwork } = await promisifyExecFile(join(__dirname, "..", "native", "get-artwork"), [song.databaseID.toString()], {
        maxBuffer: 64 * 1024 * 1024,
        encoding: "buffer"
      })
      song.artwork = artwork.toString('base64')
      mainWindow?.webContents.send('appleMusic', song)
    } catch {
      mainWindow?.webContents.send('appleMusic', song)
    }
  });

});
app.on('second-instance', (_event, commandLine) => {
  if (!mainWindow) return
  const m = commandLine[2].match(/([a-zA-Z0-9]+)\/?\?[a-zA-Z-0-9]+=([^&]+)/)
  if (m) {
    mainWindow.webContents.send('customUrl', [m[1], m[2]])
  }
})
app.on('open-url', function (event, url) {
  if (!mainWindow) return
  event.preventDefault()
  const m = url.match(/([a-zA-Z0-9]+)\/?\?[a-zA-Z-0-9]+=([^&]+)/)
  if (m) {
    mainWindow.webContents.send('customUrl', [m[1], m[2]])
  }
})
// Quit the app once all windows are closed
app.on("window-all-closed", app.quit);

// listen the channel `message` and resend the received message to the renderer process
ipcMain.on("writeText", (_event: IpcMainEvent, message: any) => {
  clipboard.writeText(message)
});
ipcMain.on("openBrowser", (_event: IpcMainEvent, message: any) => {
  shell.openExternal(message)
});
app.setAsDefaultProtocolClient('thedesk')
