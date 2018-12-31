import { ipcMain, BrowserWindow } from 'electron';
import * as log from 'electron-log';
import * as storage from 'electron-json-storage';

let settings: Settings;
let win: BrowserWindow;

export function getSettings(): Settings {
    return settings;
}

export function set_skipCoreUpdate(hash: string) {
    settings.skipCoreUpdate = hash;
    saveSettings();
}

export function set_skipWalletUpdate(version: string) {
    settings.skipWalletUpdate = version;
    saveSettings();
}

export function set_hideCoinControlFeatures(hide: boolean) {
    settings.hideCoinControlFeatures = hide;
    saveSettings();
}

export function set_locale(locale: string) {
    settings.locale = locale;
    saveSettings();
}

export function set_fullScreen(fullScreen: boolean) {
    settings.fullScreen = fullScreen;
    saveSettings();
}

export function setWindow(window) {
    win = window;
}

function loadSettings() {
    settings = new Settings();
    storage.get('settings', (error, data) => {
        if (!error && data) {
            if (data.skipCoreUpdate) settings.skipCoreUpdate = data.skipCoreUpdate;
            if (data.skipWalletUpdate) settings.skipWalletUpdate = data.skipWalletUpdate;
            if (data.locale) settings.locale = data.locale;
        }
    });
}

function saveSettings() {
    IPC_sendSettings();
    storage.set('settings', settings, () => { });
}

function setupIPC() {
    ipcMain.on('settings', (event, cmd, data) => {
        log.debug('Received IPC:settings', cmd, data);
        switch (cmd) {
            case 'GET':
                IPC_sendSettings();
                break;
            case 'SETSKIPWALLETUPDATE':
                set_skipWalletUpdate(data);
                break;
            case 'SETHIDECOINCONTROLFEATURES':
                set_hideCoinControlFeatures(data);
                break;
            case 'SETLOCALE':
                set_locale(data);
                break;
            case 'SETFULLSCREEN':
                set_fullScreen(data);
                break;
        }
    });
}

function IPC_sendSettings() {
    if (win) win.webContents.send('settings', 'GET', settings);
}


export class Settings {
    skipCoreUpdate: string = "";
    skipWalletUpdate: string = "";
    hideCoinControlFeatures: boolean = true;
    locale: string = "en";
    fullScreen: boolean = false;
}

// load settings from storage straight away
loadSettings();
// connect IPC 
setupIPC();