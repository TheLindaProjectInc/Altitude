import { ipcMain, BrowserWindow } from 'electron';
import * as log from 'electron-log';
import * as storage from 'electron-json-storage';

let store: TokenStore;
let win: BrowserWindow;

export function setWindow(window) {
    win = window;
}

export interface WatchedToken {
    address: string;
    type: 'MRC20' | 'MRC721';
    hidden: boolean;
    addedManually: boolean;
    name?: string;
    symbol?: string;
    decimals?: number;
    // MRC721 only - last-confirmed-owned tokenIds per wallet (base58) address, cached so
    // the list has something to render immediately on launch before the live
    // balanceOf()/tokenOfOwnerByIndex() refresh completes - always re-verified, never
    // trusted as-is
    ownedTokenIds?: { [walletAddress: string]: Array<string> };
}

export interface ChainTokenData {
    tokens: Array<WatchedToken>;
}

// token contract lists are network-specific (mainnet/testnet/regtest each have entirely
// different deployed contracts) but lib/settings.ts's storage is a single file shared
// across every chain - keeping this as its own chain-keyed store avoids leaking one
// network's token list into another
export class TokenStore {
    chains: { [chain: string]: ChainTokenData } = {};

    constructor(data) {
        if (data && data.chains) this.chains = data.chains;
    }

    getChainData(chain: string): ChainTokenData {
        if (!this.chains[chain]) this.chains[chain] = { tokens: [] };
        return this.chains[chain];
    }
}

function loadStore() {
    storage.get('tokens', (error, data) => {
        store = new TokenStore(data);
    });
}

function saveStore(chain: string) {
    storage.set('tokens', store, () => { });
    IPC_sendChainData(chain);
}

function IPC_sendChainData(chain: string) {
    if (win) win.webContents.send('token-store', 'GET', { chain, data: store.getChainData(chain) });
}

function setupIPC() {
    ipcMain.on('token-store', (event, cmd, data) => {
        log.debug('Received IPC:token-store', cmd, data);
        if (!store) return;
        switch (cmd) {
            case 'GET':
                IPC_sendChainData(data.chain);
                break;
            case 'SET':
                store.chains[data.chain] = data.data;
                saveStore(data.chain);
                break;
        }
    });
}

// load token store from storage straight away
loadStore();
// connect IPC
setupIPC();
