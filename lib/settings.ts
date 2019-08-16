import { ipcMain, BrowserWindow } from 'electron';
import * as log from 'electron-log';
import * as storage from 'electron-json-storage';

let settings: Settings;
let win: BrowserWindow;
let onToggleTrayIcon: Function;

export function getSettings(): Settings {
    return settings;
}

export function setOnToggleTrayHander(fn) {
    onToggleTrayIcon = fn;
}

export function set_skipCoreUpdate(hash: string) {
    settings.skipCoreUpdate = hash;
    saveSettings();
}

export function setWindow(window) {
    win = window;
}

export function set_fullScreen(fullScreen: boolean) {
    settings.fullScreen = fullScreen;
    saveSettings();
}

function set_skipWalletUpdate(version: string) {
    settings.skipWalletUpdate = version;
    saveSettings();
}

function set_hideCoinControlFeatures(hide: boolean) {
    settings.hideCoinControlFeatures = hide;
    saveSettings();
}

function set_locale(locale: string) {
    settings.locale = locale;
    saveSettings();
}

function set_currency(locale: string) {
    settings.currency = locale;
    saveSettings();
}

function set_hideTrayIcon(hideTrayIcon: boolean) {
    settings.hideTrayIcon = hideTrayIcon;
    if (onToggleTrayIcon) onToggleTrayIcon(settings.hideTrayIcon);
    saveSettings();
}

function set_minimiseToTray(minimiseToTray: boolean) {
    settings.minimiseToTray = minimiseToTray;
    saveSettings();
}

function set_minimiseOnClose(minimiseOnClose: boolean) {
    settings.minimiseOnClose = minimiseOnClose;
    saveSettings();
}

function set_blockIncoming(allowIncoming: boolean) {
    settings.blockIncomingConnections = allowIncoming;
    saveSettings();
}

function set_proxy(proxy: string) {
    settings.proxy = proxy;
    saveSettings();
}

function set_tor(proxy: string) {
    settings.tor = proxy;
    saveSettings();
}

function set_onlynet(net: string) {
    settings.onlynet = net;
    saveSettings();
}

function loadSettings() {
    storage.get('settings', (error, data) => {
        if (!error && data) settings = data;
        else settings = new Settings();
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
            case 'SETCURRENCY':
                set_currency(data);
                break;
            case 'SETFULLSCREEN':
                set_fullScreen(data);
                break;
            case 'SETHIDETRAY':
                set_hideTrayIcon(data);
                break;
            case 'SETMINIMISETRAY':
                set_minimiseToTray(data);
                break;
            case 'SETMINIMISECLOSE':
                set_minimiseOnClose(data);
                break;
            case 'SETBLOCKINCOMING':
                set_blockIncoming(data);
                break;
            case 'SETPROXY':
                set_proxy(data);
                break;
            case 'SETTOR':
                set_tor(data);
                break;
            case 'SETONLYNET':
                set_onlynet(data);
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
    currency: string = "MRX";
    fullScreen: boolean = false;
    hideTrayIcon: boolean = false;
    minimiseToTray: boolean = false;
    minimiseOnClose: boolean = false;
    blockIncomingConnections: boolean = false;
    proxy: string = '';
    tor: string = '';
    onlynet: string = '';
}

// load settings from storage straight away
loadSettings();
// connect IPC 
setupIPC();