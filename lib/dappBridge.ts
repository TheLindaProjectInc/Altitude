import { app, ipcMain, shell, webContents } from 'electron';
import * as log from 'electron-log';

const RELAY_CHANNEL = 'metrimask-bridge-relay';
const BRIDGE_CHANNEL = 'metrimask-bridge';

export function setupIPC() {
    ipcMain.on(RELAY_CHANNEL, (event, data) => {
        const { webContentsId, payload } = data || {};
        const guest = webContents.fromId(webContentsId);
        if (!guest) {
            log.warn('dappBridge: relay target webContents not found', webContentsId);
            return;
        }
        log.info('dappBridge: relaying to guest', webContentsId, payload);
        guest.send(BRIDGE_CHANNEL, payload);
    });
}


export function setupExternalLinks() {
    app.on('web-contents-created', (event, contents) => {
        if (contents.getType() !== 'webview') return;
        contents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });
    });
}
