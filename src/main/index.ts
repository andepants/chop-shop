import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { IPCResponse, IPC_CHANNELS } from '../shared/types'
import { registerIPCHandlers } from './ipc'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false // Allow loading local video files in development
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Auto-open DevTools in development mode
  if (is.dev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Custom keyboard handling - replaces optimizer.watchWindowShortcuts
  // Allows zoom shortcuts (Cmd/Ctrl + -, =, 0) to pass through to renderer
  // while maintaining security protections
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      // Production: Block refresh (Cmd/Ctrl + R)
      if (!is.dev && input.code === 'KeyR' && (input.control || input.meta)) {
        event.preventDefault()
        return
      }

      // Production: Block DevTools shortcuts (Cmd+Alt+I / Ctrl+Shift+I)
      if (!is.dev && input.code === 'KeyI' &&
          ((input.alt && input.meta) || (input.control || input.shift))) {
        event.preventDefault()
        return
      }

      // Development: F12 toggles DevTools
      if (is.dev && input.code === 'F12') {
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools()
        } else {
          mainWindow.webContents.openDevTools({ mode: 'undocked' })
        }
        event.preventDefault()
        return
      }

      // ZOOM SHORTCUTS: Allow Cmd/Ctrl + -, =, 0 to pass through to renderer
      // The renderer's Timeline.tsx will handle them with preventDefault
      // to prevent browser page zoom
      if ((input.control || input.meta)) {
        const isZoomShortcut =
          input.code === 'Minus' ||    // Cmd/Ctrl + -
          input.code === 'Equal' ||    // Cmd/Ctrl + =
          input.code === 'Digit0'      // Cmd/Ctrl + 0

        if (isZoomShortcut) {
          // Don't preventDefault - let renderer handle it!
          return
        }
      }
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // NOTE: Replaced optimizer.watchWindowShortcuts with custom implementation
  // in createWindow() to allow zoom shortcuts (Cmd/Ctrl + -, =, 0) to pass through
  // to renderer while maintaining security protections.
  // See: createWindow() -> mainWindow.webContents.on('before-input-event')

  // IPC handlers
  // Ping-pong test handler for IPC communication verification
  ipcMain.handle(IPC_CHANNELS.PING, async (): Promise<IPCResponse<string>> => {
    console.log('Received ping from renderer')
    return {
      success: true,
      data: 'pong'
    }
  })

  // Register all IPC handlers
  registerIPCHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
