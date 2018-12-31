import { app, BrowserWindow, screen, Menu, Tray, MenuItem } from 'electron';
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

function createApp() {
  createTray();
  createWindow();
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
    minHeight: 500,
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
  // set windowsize
  const handler = () => {
    const appSettings = settings.getSettings();
    if (!appSettings) setTimeout(handler, 100);
    else {
      if (appSettings.fullScreen) mainWindow.maximize();
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

function createTray() {
  // Create the Tray icon
  tray = new Tray(path.resolve(__dirname, 'assets/icons/png/16x16.png'));
  tray.setToolTip('Altitude')
  tray.on('click', toggleMainWindows)
  updateTray()
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

function updateTray(): void {
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
}

function closeApp(event) {
  if (client.proc) {
    event.preventDefault();
    // save window size
    settings.set_fullScreen(mainWindow.isMinimized());
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