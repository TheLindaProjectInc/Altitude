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

function set_syncinterval(syncInterval: number) {
    settings.syncInterval = syncInterval;
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

function set_walletBackupEnabled(enabled: boolean) {
    settings.walletBackupEnabled = enabled;
    saveSettings();
}

function set_walletBackupLocation(location: string) {
    settings.walletBackupLocation = location;
    saveSettings();
}

function set_walletBackupKeepCount(count: number) {
    settings.walletBackupKeepCount = count;
    saveSettings();
}

function set_walletBackupIntervalDays(days: number) {
    settings.walletBackupIntervalDays = days;
    saveSettings();
}

function set_blockExplorerUrlMainnet(url: string) {
    settings.blockExplorerUrlMainnet = url;
    saveSettings();
}

function set_blockExplorerUrlTestnet(url: string) {
    settings.blockExplorerUrlTestnet = url;
    saveSettings();
}

function set_blockExplorerUrlRegtest(url: string) {
    settings.blockExplorerUrlRegtest = url;
    saveSettings();
}

function set_tokenDiscoveryUrlMainnet(url: string) {
    settings.tokenDiscoveryUrlMainnet = url;
    saveSettings();
}

function set_tokenDiscoveryUrlTestnet(url: string) {
    settings.tokenDiscoveryUrlTestnet = url;
    saveSettings();
}

function set_tokenDiscoveryUrlRegtest(url: string) {
    settings.tokenDiscoveryUrlRegtest = url;
    saveSettings();
}

// gates whether Options > Developer shows the RPC override fields at all - standard
// users should never see or accidentally set these. Purely a UI-visibility gate; it does
// NOT gate whether an already-set override actually applies (see effectiveRpcConnection
// in lib/client.ts) or whether the stuck-connection recovery notice can appear, since
// someone with a leftover override from before this toggle existed still needs a way out
// regardless of the toggle's current value.
function set_devMode(enabled: boolean) {
    settings.devMode = enabled;
    saveSettings();
}

// dev-only escape hatch to point the RPC tunnel at a daemon other than the one Altitude
// itself spawns locally (e.g. another wallet instance) - empty means the normal 127.0.0.1
// behaviour. The target daemon still needs rpcallowip/rpcuser/rpcpassword configured to
// accept this connection; this setting only changes where Altitude sends the request.
//
// Scoped per chain (Mainnet/Testnet/Regtest) rather than one global value - a launch
// shortcut can pick any of the three networks via -testnet/-regtest, and an override set
// while running one network must never silently keep applying after switching to another
// (see Client.effectiveRpcConnection in lib/client.ts, which reads whichever chain-suffixed
// field matches the currently detected chain).
function set_devRpc(field: 'devRpcHost' | 'devRpcPort' | 'devRpcUser' | 'devRpcPassword', chainSuffix: 'Mainnet' | 'Testnet' | 'Regtest', value: string) {
    settings[`${field}${chainSuffix}`] = value;
    saveSettings();
}

// set internally by Client once a scheduled backup completes - not user-facing, so no
// IPC case for it, just a plain export the main process can call directly
export function set_lastWalletBackup(timestamp: number) {
    settings.lastWalletBackup = timestamp;
    saveSettings();
}

function loadSettings() {
    storage.get('settings', (error, data) => {
        settings = new Settings(data)
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
            case 'SETSYNCINTERVAL':
                set_syncinterval(data);
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
            case 'SETWALLETBACKUPENABLED':
                set_walletBackupEnabled(data);
                break;
            case 'SETWALLETBACKUPLOCATION':
                set_walletBackupLocation(data);
                break;
            case 'SETWALLETBACKUPKEEPCOUNT':
                set_walletBackupKeepCount(data);
                break;
            case 'SETWALLETBACKUPINTERVALDAYS':
                set_walletBackupIntervalDays(data);
                break;
            case 'SETBLOCKEXPLORERURLMAINNET':
                set_blockExplorerUrlMainnet(data);
                break;
            case 'SETBLOCKEXPLORERURLTESTNET':
                set_blockExplorerUrlTestnet(data);
                break;
            case 'SETBLOCKEXPLORERURLREGTEST':
                set_blockExplorerUrlRegtest(data);
                break;
            case 'SETTOKENDISCOVERYURLMAINNET':
                set_tokenDiscoveryUrlMainnet(data);
                break;
            case 'SETTOKENDISCOVERYURLTESTNET':
                set_tokenDiscoveryUrlTestnet(data);
                break;
            case 'SETTOKENDISCOVERYURLREGTEST':
                set_tokenDiscoveryUrlRegtest(data);
                break;
            case 'SETDEVMODE':
                set_devMode(data);
                break;
            case 'SETDEVRPCHOSTMAINNET':
                set_devRpc('devRpcHost', 'Mainnet', data);
                break;
            case 'SETDEVRPCHOSTTESTNET':
                set_devRpc('devRpcHost', 'Testnet', data);
                break;
            case 'SETDEVRPCHOSTREGTEST':
                set_devRpc('devRpcHost', 'Regtest', data);
                break;
            case 'SETDEVRPCPORTMAINNET':
                set_devRpc('devRpcPort', 'Mainnet', data);
                break;
            case 'SETDEVRPCPORTTESTNET':
                set_devRpc('devRpcPort', 'Testnet', data);
                break;
            case 'SETDEVRPCPORTREGTEST':
                set_devRpc('devRpcPort', 'Regtest', data);
                break;
            case 'SETDEVRPCUSERMAINNET':
                set_devRpc('devRpcUser', 'Mainnet', data);
                break;
            case 'SETDEVRPCUSERTESTNET':
                set_devRpc('devRpcUser', 'Testnet', data);
                break;
            case 'SETDEVRPCUSERREGTEST':
                set_devRpc('devRpcUser', 'Regtest', data);
                break;
            case 'SETDEVRPCPASSWORDMAINNET':
                set_devRpc('devRpcPassword', 'Mainnet', data);
                break;
            case 'SETDEVRPCPASSWORDTESTNET':
                set_devRpc('devRpcPassword', 'Testnet', data);
                break;
            case 'SETDEVRPCPASSWORDREGTEST':
                set_devRpc('devRpcPassword', 'Regtest', data);
                break;
        }
    });
}

function IPC_sendSettings() {
    if (win) win.webContents.send('settings', 'GET', settings);
}

export class Settings {
    _skipCoreUpdate: string = "";
    _skipWalletUpdate: string = "";
    hideCoinControlFeatures: boolean = true;
    locale: string = "en";
    currency: string = "MRX";
    fullScreen: boolean = false;
    hideTrayIcon: boolean = false;
    minimiseToTray: boolean = false;
    syncInterval: number = 10000;
    minimiseOnClose: boolean = false;
    blockIncomingConnections: boolean = false;
    proxy: string = '';
    tor: string = '';
    onlynet: string = '';
    walletBackupEnabled: boolean = true;
    // empty = use the default (<wallet data directory>/backup), computed by Client since
    // only it knows the data directory location
    walletBackupLocation: string = '';
    walletBackupKeepCount: number = 5;
    walletBackupIntervalDays: number = 14;
    lastWalletBackup: number = 0;
    // empty = use the built-in default for that network (see ElectronService/lib/client.ts) -
    // same "empty means default" convention as walletBackupLocation above
    blockExplorerUrlMainnet: string = '';
    blockExplorerUrlTestnet: string = '';
    blockExplorerUrlRegtest: string = '';
    tokenDiscoveryUrlMainnet: string = '';
    tokenDiscoveryUrlTestnet: string = '';
    tokenDiscoveryUrlRegtest: string = '';
    // gates visibility of the RPC override fields in Options > Developer - see
    // set_devMode() above
    devMode: boolean = false;
    // dev-only: empty means the normal 127.0.0.1 connection to Altitude's own locally
    // spawned daemon; overriding these points the RPC tunnel at a different daemon
    // entirely (e.g. a remote regtest instance) - if it's reachable, Client.startClient()
    // detects it as already running and never downloads/spawns a local one at all.
    // Scoped per chain - see set_devRpc() above for why.
    devRpcHostMainnet: string = '';
    devRpcHostTestnet: string = '';
    devRpcHostRegtest: string = '';
    devRpcPortMainnet: string = '';
    devRpcPortTestnet: string = '';
    devRpcPortRegtest: string = '';
    devRpcUserMainnet: string = '';
    devRpcUserTestnet: string = '';
    devRpcUserRegtest: string = '';
    devRpcPasswordMainnet: string = '';
    devRpcPasswordTestnet: string = '';
    devRpcPasswordRegtest: string = '';

    constructor(data) {
        if (data) {
            for (const key in data) {
                // previously skipped any falsy value (0, '', false), not just
                // missing/undefined ones - meaning a saved "false"/""/"0" would be
                // silently discarded in favour of the class default on next load. Most
                // existing booleans here default to false so it went unnoticed, but it
                // would have broken persisting walletBackupEnabled=false, since that
                // one defaults to true
                if (data[key] !== undefined && data[key] !== null) this[key] = data[key]
            }
        }
    }

    get skipCoreUpdate(): string {
        return this._skipCoreUpdate ? this._skipCoreUpdate.toUpperCase() : ""
    }
    set skipCoreUpdate(value: string) {
        this._skipCoreUpdate = value.toUpperCase();
    }

    get skipWalletUpdate(): string {
        return this._skipWalletUpdate ? this._skipWalletUpdate.toUpperCase() : ""
    }
    set skipWalletUpdate(value: string) {
        this._skipWalletUpdate = value.toUpperCase();
    }

}

// load settings from storage straight away
loadSettings();
// connect IPC 
setupIPC();