import { Injectable } from '@angular/core';
import { ElectronService } from 'app/providers/electron.service';
import { ChainType } from 'app/enum';

export interface WatchedToken {
    address: string;
    type: 'MRC20' | 'MRC721';
    hidden: boolean;
    addedManually: boolean;
    name?: string;
    symbol?: string;
    decimals?: number;
    ownedTokenIds?: { [walletAddress: string]: Array<string> };
}

export interface ChainTokenData {
    tokens: Array<WatchedToken>;
}

// thin wrapper around the 'token-store' IPC channel (lib/tokens.ts on the main-process
// side) - token contract lists are network-specific, so every request/save is scoped to
// the currently active chain rather than reusing the (non chain-scoped) settings store
@Injectable()
export class TokenStoreService {

    constructor(private electron: ElectronService) { }

    private get chainKey(): string {
        return ChainType[this.electron.chain];
    }

    // one-shot request/response over the 'token-store' broadcast channel, mirroring
    // ElectronService.checkBootstrap()'s pattern
    load(): Promise<ChainTokenData> {
        return new Promise((resolve) => {
            const chain = this.chainKey;
            const handler = (event, cmd, data) => {
                if (cmd === 'GET' && data.chain === chain) {
                    this.electron.ipcRenderer.removeListener('token-store', handler);
                    resolve(data.data);
                }
            };
            this.electron.ipcRenderer.on('token-store', handler);
            this.electron.ipcRenderer.send('token-store', 'GET', { chain });
        });
    }

    save(data: ChainTokenData) {
        this.electron.ipcRenderer.send('token-store', 'SET', { chain: this.chainKey, data });
    }
}
