import { ipcMain, BrowserWindow } from 'electron';
import * as log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import * as settings from './settings';

let win: BrowserWindow;
// whether the in-flight check should be silently skipped for a version the user already dismissed
let pendingShowSkip = true;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.logger = log;

export function setWindow(window: BrowserWindow) {
    win = window;
}

function IPC_send(cmd: string, data: any = null) {
    if (win) win.webContents.send('app-update', cmd, data);
}

function setupListeners() {
    ipcMain.on('app-update', (event, cmd, data) => {
        log.debug('Received IPC:app-update', cmd, data);
        switch (cmd) {
            case 'CHECK':
                pendingShowSkip = data !== false;
                autoUpdater.checkForUpdates().catch(ex => {
                    log.error('Updater', 'Check failed', ex);
                    IPC_send('ERROR');
                });
                break;
            case 'DOWNLOAD':
                autoUpdater.downloadUpdate().catch(ex => {
                    log.error('Updater', 'Download failed', ex);
                    IPC_send('DOWNLOADERROR');
                });
                break;
            case 'INSTALL':
                autoUpdater.quitAndInstall();
                break;
        }
    });

    autoUpdater.on('update-available', info => {
        // respect a previously skipped version unless the user explicitly asked to check
        if (pendingShowSkip && settings.getSettings().skipWalletUpdate === info.version.toUpperCase()) {
            log.info('Updater', 'Update available but skipped by user', info.version);
            IPC_send('NOTAVAILABLE');
            return;
        }
        log.info('Updater', 'Update available', info.version);
        IPC_send('AVAILABLE', { version: info.version, showSkip: pendingShowSkip });
    });

    autoUpdater.on('update-not-available', () => {
        log.info('Updater', 'No update available');
        IPC_send('NOTAVAILABLE');
    });

    autoUpdater.on('download-progress', progress => {
        IPC_send('PROGRESS', progress);
    });

    autoUpdater.on('update-downloaded', info => {
        log.info('Updater', 'Update downloaded', info.version);
        IPC_send('DOWNLOADED', { version: info.version });
    });
}

setupListeners();
