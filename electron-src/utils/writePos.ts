import fs from 'node:fs'
import type { WindowState } from '../types.js'
import { screen, app } from 'electron'
import { join } from 'node:path'

const appDataPath = join(app.getPath('appData'), app.getName())
const windowStatePath = join(appDataPath, 'window-state.json')
export function writePos(mainWindow: Electron.BrowserWindow | null) {
    if (!mainWindow) return
    const size: WindowState = {
        ...mainWindow.getBounds(),
        isMaximized: mainWindow.isMaximized(),
        isFullScreen: mainWindow.isFullScreen(),
        displayBounds: screen.getPrimaryDisplay().bounds
    }
    fs.writeFileSync(windowStatePath, JSON.stringify(size))
}
