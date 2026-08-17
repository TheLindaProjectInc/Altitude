import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ElectronService } from 'app/providers/electron.service';

export interface ExplorerMRC20Balance {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: string;
}

export interface ExplorerMRC721Balance {
    address: string;
    name: string;
    symbol: string;
    count: number;
}

// Read-only, best-effort discovery source - it only ever tells us WHICH contracts a
// wallet address has interacted with. It is never trusted as authoritative and never
// used for anything that touches funds: every balance/ownership number actually shown
// to the user, and every send, is always re-verified/executed live against the local
// daemon (balanceOf/ownerOf/tokenOfOwnerByIndex/sendtocontract), exactly like every
// other value in this wallet. This avoids requiring the daemon's `logevents` flag and
// the one-time chain reindex that would otherwise be needed for local searchlogs-based
// discovery - not something we can force on every existing wallet at once.
@Injectable()
export class TokenExplorerService {

    constructor(private http: HttpClient, private electron: ElectronService) { }

    private get baseUrl(): string | null {
        // customisable via Options > Explorer; empty (regtest has no default) means
        // auto-discovery is unavailable but manual add still works
        return this.electron.tokenDiscoveryUrl() || null;
    }

    get available(): boolean {
        return this.baseUrl !== null;
    }

    async getAddressTokens(address: string): Promise<{ mrc20: Array<ExplorerMRC20Balance>; mrc721: Array<ExplorerMRC721Balance> }> {
        if (!this.baseUrl) return { mrc20: [], mrc721: [] };
        const data: any = await this.http.get(`${this.baseUrl}/api/address/${address}`).toPromise();
        return {
            mrc20: Array.isArray(data && data.mrc20Balances) ? data.mrc20Balances : [],
            mrc721: Array.isArray(data && data.mrc721Balances) ? data.mrc721Balances : [],
        };
    }
}
