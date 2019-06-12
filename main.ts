import { app, BrowserWindow, screen, Menu, Tray, ipcMain } from 'electron';
import * as path from 'path';
import * as url from 'url';
import Client from './lib/client';
import * as log from 'electron-log';
import * as settings from './lib/settings';

log.transports.console.level = 'info'
log.transports.file.level = 'info'

let mainWindow, serve, client;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

let tray: Tray
let isHidden = false;

// listen if we toggle the tray icon
settings.setOnToggleTrayHander(toggleTray);

function createApp() {
  createWindow();
  setupIPC();
}

function createWindow() {
  // Create the browser window.
  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;
  let height = 600;
  let width = 900;
  if (!app.isPackaged) {
    height = size.height;
    width = size.width;
  }
  mainWindow = new BrowserWindow({
    center: true,
    minWidth: 800,
    minHeight: 535,
    title: 'Altitude',
    width: width < size.width ? width : size.width,
    height: height < size.height ? height : size.height,
    icon: path.join(__dirname, 'assets/icons/png/512x512.png'),
    webPreferences: { webSecurity: false },
    frame: process.platform !== 'win32',
    titleBarStyle: 'hidden'
  });

  if (serve) {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    mainWindow.loadURL('http://localhost:4200');
  } else {
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  // setup settings
  log.info('Initiate settings');
  settings.setWindow(mainWindow);
  // make any adjustments when settings are ready
  const handler = () => {
    const appSettings = settings.getSettings();
    if (!appSettings) setTimeout(handler, 100);
    else {
      if (appSettings.fullScreen) mainWindow.maximize();
      toggleTray(appSettings.hideTrayIcon);
    }
  }
  handler();

  // start client
  log.info('Start client');
  client = new Client(mainWindow)

  // open dev tools
  if (!app.isPackaged) mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    client.destroy();
    mainWindow = null;
  });

  mainWindow.on("close", e => {
    if (client.proc) {
      closeApp(e);
    } else {
      e.returnValue = true;
    }
  });

}

function createTray(force: boolean = false) {
  // Create the Tray icon
  tray = new Tray(path.resolve(__dirname, 'assets/icons/png/16x16.png'));
  tray.setToolTip('Altitude')
  tray.on('click', toggleMainWindows);
  updateTray(force)
}

function toggleTray(hide) {
  if (hide && tray) tray.destroy();
  else if (!hide) createTray();
}

function toggleMainWindows(): void {
  if (isHidden) {
    mainWindow.show()
    isHidden = false
    updateTray()
  } else {
    mainWindow.hide()
    isHidden = true
    updateTray()
  }
}

function updateTray(force: boolean = false): void {
  if (force || !settings.getSettings().hideTrayIcon) {
    const contextMenu: Menu = Menu.buildFromTemplate(
      (isHidden
        ? [{
          click: toggleMainWindows,
          label: 'Show Altitude',
        }]
        : [{
          click: toggleMainWindows,
          label: 'Hide Altitude',
        }]
      ).concat(
        [{
          click: () => app.quit(),
          label: 'Exit',
        }]
      )
    )
    tray.setContextMenu(contextMenu)
  } else if (isHidden) {
    createTray(true);
  } else {
    toggleTray(true)
  }
}

function closeApp(event) {
  if (client.proc) {
    event.preventDefault();
    client.stop().then(() => {
      app.quit();
    });
  }
}

try {
  // check single instance
  if (!app.requestSingleInstanceLock()) {
    app.quit()
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
    })

    // create app
    app.on('ready', createApp);

    // register on quit handler to close client if running
    app.on('before-quit', closeApp);

    // Quit when all windows are closed.
    app.on('window-all-closed', (event) => {
      // On OS X it is common for applications and their menu bar
      // to stay active until the user quits explicitly with Cmd + Q
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      // On OS X it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) {
        createApp();
      }
    });
  }
} catch (e) {
  // Catch Error
  // throw e;
}

function setupIPC() {
  ipcMain.on('window', (event, cmd, data) => {
    log.debug('Received IPC:window', cmd, data);
    switch (cmd) {
      case 'HIDE':
        toggleMainWindows();
        break;
    }
  });
}