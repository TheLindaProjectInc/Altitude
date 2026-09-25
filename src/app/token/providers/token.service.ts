import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import Big from 'big.js';
import { RpcService, RPCMethods } from 'app/metrix/providers/rpc.service';
import { WalletService } from 'app/metrix/providers/wallet.service';
import Helpers from 'app/helpers';
import { TokenContractService } from './token-contract.service';
import { TokenStoreService, ChainTokenData, WatchedToken } from './token-store.service';
import { TokenExplorerService } from './token-explorer.service';
import { Token } from '../classes/token';
import { NFT } from '../classes/nft';

@Injectable()
export class TokenService {

    tokens: Array<Token> = [];
    initialized = false;
    // true while discovering new contracts via the explorer (see providers/token-explorer.service.ts)
    scanning = false;
    scanProgress: { current: number; target: number } = null;
    // true whenever balances/ownership are being (re)fetched from the daemon - separate
    // from `scanning` so the UI can still show "something is happening" during the
    // (often longer) per-token/per-address balanceOf/tokenOfOwnerByIndex sweep
    refreshingBalances = false;

    get busy(): boolean {
        return this.scanning || this.refreshingBalances;
    }

    readonly defaultGasLimit = 250000;

    private chainData: ChainTokenData = { tokens: [] };
    private newBlockReceivedSub: Subscription;
    private onAccountsUpdatedSub: Subscription;
    private lastScanTs = 0;
    private readonly scanThrottleMs = 30000;
    private refreshing = false;

    private log(...args: any[]) {
        if (isDevMode()) console.log('[Token]', ...args);
    }

    constructor(
        private rpc: RpcService,
        private wallet: WalletService,
        private tokenContract: TokenContractService,
        private tokenStore: TokenStoreService,
        private tokenExplorer: TokenExplorerService,
        private http: HttpClient,
    ) {
        this.init();
        this.newBlockReceivedSub = this.wallet.newBlockReceived.subscribe(() => {
            if (this.wallet.accounts.length) {
                if (this.onAccountsUpdatedSub) this.onAccountsUpdatedSub.unsubscribe();
                this.refresh();
            } else if (!this.onAccountsUpdatedSub) {
                this.onAccountsUpdatedSub = this.wallet.accountsUpdated.subscribe(() => this.refresh());
            }
        });
    }

    ngOnDestroy() {
        if (this.newBlockReceivedSub) this.newBlockReceivedSub.unsubscribe();
        if (this.onAccountsUpdatedSub) this.onAccountsUpdatedSub.unsubscribe();
    }

    // called when the user switches chain (mainnet/testnet/regtest) without a full app
    // restart - mirrors DGPService.resetState()/WalletService.resetState() so no
    // in-memory state from the previous network lingers
    resetState() {
        this.tokens = [];
        this.initialized = false;
        this.scanning = false;
        this.scanProgress = null;
        // an in-flight scan for the previous chain isn't aborted (no cancellation token),
        // it'll just keep running against now-stale data and reset these same flags itself
        // once it finishes - but without resetting refreshing here too, refresh() would
        // keep skipping the new chain's own scans as "already in progress" until that
        // orphaned old-chain scan eventually completes
        this.refreshing = false;
        this.chainData = { tokens: [] };
        this.init();
    }

    private get walletAddresses(): Array<string> {
        return this.wallet.addressList.map(a => String(a));
    }

    // converts wallet (base58) addresses to their 20-byte hex form individually rather
    // than via a single Promise.all - the daemon's gethexaddress RPC rejects anything
    // that isn't a plain pubkeyhash address (e.g. an imported P2SH/multisig address), and
    // such addresses can never hold or send MRC20/MRC721 tokens through contract calls
    // anyway, so they're simply skipped rather than one bad address failing the whole batch
    private async resolveHexAddresses(addresses: Array<string>): Promise<{ addresses: Array<string>; hexAddrs: Array<string> }> {
        const resolvedAddresses: Array<string> = [];
        const resolvedHex: Array<string> = [];
        await Promise.all(addresses.map(async (address) => {
            try {
                const hexAddress = await this.tokenContract.toHexAddress(address);
                if (hexAddress) {
                    resolvedAddresses.push(address);
                    resolvedHex.push(hexAddress);
                }
            } catch (ex) {
                this.log('Skipping address not usable for contract calls', address, ex);
            }
        }));
        return { addresses: resolvedAddresses, hexAddrs: resolvedHex };
    }

    private async init() {
        this.chainData = await this.tokenStore.load();
        this.tokens = (this.chainData.tokens || []).map(t => this.hydrateToken(t));
        this.initialized = true;
        this.refresh(true);
    }

    private hydrateToken(data: WatchedToken): Token {
        const token = new Token({
            address: data.address,
            type: data.type,
            name: data.name || '',
            symbol: data.symbol || '',
            decimals: data.decimals || 0,
            hidden: !!data.hidden,
            addedManually: !!data.addedManually,
        });
        if (data.ownedTokenIds) {
            Object.keys(data.ownedTokenIds).forEach(addr => token.ownedTokens.set(addr, data.ownedTokenIds[addr].slice()));
        }
        return token;
    }

    private persist() {
        this.chainData.tokens = this.tokens.map(t => this.serializeToken(t));
        this.tokenStore.save(this.chainData);
    }

    private serializeToken(token: Token): WatchedToken {
        const ownedTokenIds = {};
        token.ownedTokens.forEach((ids, addr) => { if (ids.length) ownedTokenIds[addr] = ids.slice(); });
        return {
            address: token.address,
            type: token.type,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            hidden: token.hidden,
            addedManually: token.addedManually,
            ownedTokenIds,
        };
    }

    async refresh(force = false) {
        if (!this.initialized) { this.log('refresh: skipped, not initialized yet'); return; }
        if (!this.wallet.accounts.length) { this.log('refresh: skipped, no wallet accounts loaded yet'); return; }
        if (this.refreshing) { this.log('refresh: skipped, a refresh is already in progress'); return; }
        if (!force && Date.now() - this.lastScanTs < this.scanThrottleMs) { this.log('refresh: skipped, throttled'); return; }

        this.refreshing = true;
        this.lastScanTs = Date.now();
        this.log('refresh: starting (force =', force, ')');
        try {
            try {
                await this.discoverTokens();
            } catch (ex) {
                console.warn('[Token] discovery failed', ex);
            }
            try {
                await this.refreshBalances();
            } catch (ex) {
                console.warn('[Token] balance refresh failed', ex);
            }
            this.log('refresh: complete');
        } finally {
            this.refreshing = false;
        }
    }

    // manual re-trigger for the "Refresh" button - same as a normal forced refresh, kept
    // as its own method so the UI has a stable name to call regardless of internals
    async rescan() {
        await this.refresh(true);
    }

    // -------- discovery --------

    // Finds which contracts a wallet address has ever interacted with via a public block
    // explorer (see token-explorer.service.ts) - purely to know WHICH contracts to look
    // at. Nothing from the explorer is ever trusted directly: every contract found is
    // independently classified via a live callcontract, and every actual balance/
    // ownership number is independently re-derived from the daemon in refreshBalances().
    private async discoverTokens() {
        if (!this.tokenExplorer.available) {
            this.log('discoverTokens: no public explorer for this chain - auto-discovery skipped, manual add still works');
            return;
        }
        const addresses = this.walletAddresses;
        if (!addresses.length) return;

        this.scanning = true;
        this.log('discoverTokens: checking', addresses.length, 'address(es) via explorer');
        try {
            for (let i = 0; i < addresses.length; i++) {
                this.scanProgress = { current: i + 1, target: addresses.length };
                let result;
                try {
                    result = await this.tokenExplorer.getAddressTokens(addresses[i]);
                } catch (ex) {
                    console.warn('[Token] explorer lookup failed for', addresses[i], ex);
                    continue;
                }
                for (const entry of result.mrc20) await this.ensureToken(entry.address);
                for (const entry of result.mrc721) await this.ensureToken(entry.address);
            }
        } finally {
            this.scanning = false;
            this.scanProgress = null;
        }
    }

    // adds a contract to the watch list if it isn't already known - classification is
    // always done locally (never trusts the explorer's own type label)
    private async ensureToken(contractAddress: string): Promise<Token | null> {
        const contractHex = contractAddress.replace(/^0x/, '').toLowerCase();
        let token = this.tokens.find(t => t.address === contractHex);
        if (token) return token;
        token = await this.classifyContract(contractHex);
        if (!token) {
            this.log('ensureToken:', contractHex, 'did not classify as MRC20 or MRC721 - skipping');
            return null;
        }
        this.log('ensureToken: discovered new', token.type, 'contract', contractHex, `(${token.symbol})`, 'via explorer');
        this.tokens.push(token);
        this.persist();
        return token;
    }

    private async classifyContract(contractHex: string): Promise<Token | null> {
        const [decimalsResult, totalSupplyResult] = await Promise.all([
            this.tokenContract.call(contractHex, this.tokenContract.mrc20Iface, 'decimals'),
            this.tokenContract.call(contractHex, this.tokenContract.mrc20Iface, 'totalSupply'),
        ]);
        if (decimalsResult && totalSupplyResult) {
            const [name, symbol] = await Promise.all([
                this.tokenContract.call(contractHex, this.tokenContract.mrc20Iface, 'name'),
                this.tokenContract.call(contractHex, this.tokenContract.mrc20Iface, 'symbol'),
            ]);
            return new Token({
                address: contractHex, type: 'MRC20', decimals: Number(decimalsResult[0]),
                name: name ? String(name[0]) : '', symbol: symbol ? String(symbol[0]) : '',
            });
        }
        const supports = await this.tokenContract.call(
            contractHex, this.tokenContract.mrc721Iface, 'supportsInterface', ['0x' + this.tokenContract.erc721InterfaceId],
        );
        if (supports && supports[0] === true) {
            const [name, symbol] = await Promise.all([
                this.tokenContract.call(contractHex, this.tokenContract.mrc721Iface, 'name'),
                this.tokenContract.call(contractHex, this.tokenContract.mrc721Iface, 'symbol'),
            ]);
            return new Token({
                address: contractHex, type: 'MRC721',
                name: name ? String(name[0]) : '', symbol: symbol ? String(symbol[0]) : '',
            });
        }
        return null;
    }

    // -------- balances / ownership --------

    private async refreshBalances() {
        if (this.refreshingBalances) return;
        const { addresses, hexAddrs } = await this.resolveHexAddresses(this.walletAddresses);
        if (!addresses.length) { this.log('refreshBalances: no contract-compatible addresses, skipping'); return; }
        if (!this.tokens.length) { this.log('refreshBalances: no tokens known yet, skipping'); return; }

        this.log('refreshBalances: refreshing', this.tokens.length, 'token(s) across', addresses.length, 'address(es)');
        this.refreshingBalances = true;
        try {
            for (const token of this.tokens) {
                if (token.type === 'MRC20') {
                    await this.refreshMRC20Balance(token, addresses, hexAddrs);
                } else {
                    await this.refreshOwnership(token, addresses, hexAddrs);
                }
            }
            this.persist();
        } finally {
            this.refreshingBalances = false;
        }
    }

    private async refreshMRC20Balance(token: Token, addresses: Array<string>, hexAddrs: Array<string>) {
        for (let i = 0; i < addresses.length; i++) {
            const result = await this.tokenContract.call(
                token.address, this.tokenContract.mrc20Iface, 'balanceOf', ['0x' + hexAddrs[i]], hexAddrs[i],
            );
            if (result) token.balances.set(addresses[i], token.fromRaw(result[0] as bigint));
        }
    }

    // Determines exactly which tokenIds an address owns purely from live on-chain calls -
    // balanceOf() gives the count, then tokenOfOwnerByIndex() (the ERC721 Enumerable
    // extension) walks that count to get each tokenId. No log index/explorer needed for
    // this at all. Contracts that don't implement Enumerable fall back to just recording
    // the known count (from balanceOf) without individual tokenIds.
    private async refreshOwnership(token: Token, addresses: Array<string>, hexAddrs: Array<string>) {
        const newOwnedTokens = new Map<string, Array<string>>();
        const newNonEnumerableCounts = new Map<string, number>();
        for (let i = 0; i < addresses.length; i++) {
            const balanceResult = await this.tokenContract.call(
                token.address, this.tokenContract.mrc721Iface, 'balanceOf', ['0x' + hexAddrs[i]],
            );
            const count = balanceResult ? Number(balanceResult[0]) : 0;
            if (!count) continue;

            const ids: Array<string> = [];
            let enumerable = true;
            for (let index = 0; index < count; index++) {
                const idResult = await this.tokenContract.call(
                    token.address, this.tokenContract.mrc721Iface, 'tokenOfOwnerByIndex', ['0x' + hexAddrs[i], index],
                );
                if (!idResult) { enumerable = false; break; }
                ids.push(String(idResult[0]));
            }
            if (enumerable) {
                newOwnedTokens.set(addresses[i], ids);
            } else {
                this.log('refreshOwnership:', token.address, 'is not Enumerable -', addresses[i], 'holds', count, 'but specific tokenIds are unavailable');
                newNonEnumerableCounts.set(addresses[i], count);
            }
        }
        this.log('refreshOwnership:', token.address, `(${token.symbol})`, 'resolved to', newOwnedTokens, newNonEnumerableCounts);
        token.ownedTokens = newOwnedTokens;
        token.nonEnumerableCounts = newNonEnumerableCounts;
    }

    // -------- manual add / hide --------

    async probeContract(contractAddress: string): Promise<Token | null> {
        return this.classifyContract(contractAddress.replace(/^0x/, '').toLowerCase());
    }

    async addTokenManually(contractAddress: string): Promise<Token> {
        const contractHex = contractAddress.replace(/^0x/, '').toLowerCase();
        let token = this.tokens.find(t => t.address === contractHex);
        if (token) {
            token.hidden = false;
            token.addedManually = true;
        } else {
            token = await this.classifyContract(contractHex);
            if (!token) return null;
            token.addedManually = true;
            this.tokens.push(token);
        }
        this.persist();
        this.log('addTokenManually:', contractHex, '- type', token.type);
        const { addresses, hexAddrs } = await this.resolveHexAddresses(this.walletAddresses);
        if (token.type === 'MRC20') {
            await this.refreshMRC20Balance(token, addresses, hexAddrs);
        } else {
            // balanceOf()/tokenOfOwnerByIndex() are plain live contract calls scoped to
            // just this wallet's own addresses - no history scan of any kind needed, so
            // a manual add works identically and immediately regardless of whether the
            // explorer ever saw this contract
            await this.refreshOwnership(token, addresses, hexAddrs);
        }
        this.persist();
        return token;
    }

    hideToken(token: Token) {
        token.hidden = true;
        this.persist();
    }

    unhideToken(token: Token) {
        token.hidden = false;
        this.persist();
    }

    // -------- sending --------

    async getDefaultGasPrice(): Promise<string> {
        try {
            const dgpInfo: any = await this.rpc.requestData(RPCMethods.GETDGPINFO);
            if (dgpInfo && dgpInfo.mingasprice !== undefined) {
                return (Helpers.fromSatoshi(Big(dgpInfo.mingasprice)) as Big).toFixed(8);
            }
        } catch (ex) { }
        return '0.00010000';
    }

    async sendMRC20(token: Token, fromAddress: string, toAddress: string, amount: Big, gasLimit: number, gasPrice: string, passphrase: string): Promise<any> {
        const [fromHex, toHex] = await Promise.all([
            this.tokenContract.toHexAddress(fromAddress),
            this.tokenContract.toHexAddress(toAddress),
        ]);
        try {
            await this.rpc.unlockWalletForCommand(passphrase);
            const data: any = await this.tokenContract.send(
                token.address, this.tokenContract.mrc20Iface, 'transfer',
                ['0x' + toHex, token.toRaw(amount)], 0, gasLimit, gasPrice, fromHex,
            );
            this.rpc.lockWalletAfterCommand(passphrase);
            if (!data || data.error) throw data;
            await this.refreshTokenForAddresses(token, [fromAddress, toAddress]);
            return data;
        } catch (ex) {
            this.rpc.lockWalletAfterCommand(passphrase);
            throw ex;
        }
    }

    async sendMRC721(token: Token, fromAddress: string, toAddress: string, tokenId: string, gasLimit: number, gasPrice: string, passphrase: string): Promise<any> {
        const [fromHex, toHex] = await Promise.all([
            this.tokenContract.toHexAddress(fromAddress),
            this.tokenContract.toHexAddress(toAddress),
        ]);
        try {
            await this.rpc.unlockWalletForCommand(passphrase);
            // safeTransferFrom preferred over bare transferFrom - matches
            // OpenZeppelin/MetaMask's own safety preference (reverts rather than
            // stranding the token if the recipient can't handle ERC721s)
            const data: any = await this.tokenContract.send(
                token.address, this.tokenContract.mrc721Iface, 'safeTransferFrom(address,address,uint256)',
                ['0x' + fromHex, '0x' + toHex, tokenId], 0, gasLimit, gasPrice, fromHex,
            );
            this.rpc.lockWalletAfterCommand(passphrase);
            if (!data || data.error) throw data;
            await this.refreshTokenForAddresses(token, [fromAddress, toAddress]);
            return data;
        } catch (ex) {
            this.rpc.lockWalletAfterCommand(passphrase);
            throw ex;
        }
    }

    // targeted re-check for just the addresses involved in a send, so the UI updates
    // promptly rather than waiting for the next full refresh pass
    private async refreshTokenForAddresses(token: Token, involvedAddresses: Array<string>) {
        if (token.type === 'MRC20') {
            const { addresses, hexAddrs } = await this.resolveHexAddresses(involvedAddresses);
            await this.refreshMRC20Balance(token, addresses, hexAddrs);
        } else {
            const { addresses, hexAddrs } = await this.resolveHexAddresses(this.walletAddresses);
            await this.refreshOwnership(token, addresses, hexAddrs);
        }
        this.persist();
    }

    // -------- NFT metadata (on-demand only) --------

    async loadNFTMetadata(nft: NFT): Promise<void> {
        if (nft.metadataLoaded || nft.metadataLoading) return;
        nft.metadataLoading = true;
        try {
            const result = await this.tokenContract.call(nft.contractAddress, this.tokenContract.mrc721Iface, 'tokenURI', [nft.tokenId]);
            const uri = result ? String(result[0]) : '';
            nft.tokenURI = uri;
            if (uri) {
                const resolvedUri = uri.startsWith('ipfs://') ? 'https://ipfs.io/ipfs/' + uri.slice('ipfs://'.length) : uri;
                if (/^https?:\/\//i.test(resolvedUri)) {
                    const metadata: any = await this.http.get(resolvedUri).toPromise();
                    nft.name = metadata.name || '';
                    nft.description = metadata.description || '';
                    const image = metadata.image || '';
                    nft.image = image.startsWith('ipfs://') ? 'https://ipfs.io/ipfs/' + image.slice('ipfs://'.length) : image;
                }
            }
            nft.metadataLoaded = true;
        } catch (ex) {
            nft.metadataError = true;
        } finally {
            nft.metadataLoading = false;
        }
    }
}
