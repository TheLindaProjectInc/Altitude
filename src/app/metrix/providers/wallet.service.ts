import { Injectable, Output, EventEmitter } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import Big from 'big.js';
import { RPCMethods, RpcService } from './rpc.service';
import Helpers from 'app/helpers';
import { ElectronService } from 'app/providers/electron.service';
import { ErrorService } from 'app/providers/error.service';
import {
    Account,
    Address,
    AddressBookItem,
    Input,
    Peer,
    StakingStatus,
    Transaction,
    WalletInfo,
    EncryptionStatus,
    BlockchainStatus,
    NetworkInfo
} from '../classes';
import { DesktopNotificationService } from '../../providers/desktop-notification.service';

@Injectable()
export class WalletService {
    // account filters
    accountFilters = {
        hideEmptyAccounts: true,
        sort: 'name'
    }

    // syncing flag
    running: boolean;

    // timers
    conversionSyncTimer;
    syncServiceTimer;

    // wallet state
    walletInfo: WalletInfo;
    networkInfo: NetworkInfo;
    blockchainStatus: BlockchainStatus;
    stakingStatus: StakingStatus;

    // transactions
    private _transactions: Array<Transaction>;
    // accounts
    private _accounts: Array<Account>;
    // peers list
    private _peers: Array<Peer>;
    // address book
    private _addressBook: Array<AddressBookItem>;

    // data syncs
    dataSyncs = [
        { timestamp: 0, interval: 10000, async: true, showLoading: false, running: false, name: DATASYNCTYPES.WALLET, fn: () => this.syncWallet() },
        { timestamp: 0, interval: 10000, async: true, showLoading: false, running: false, name: DATASYNCTYPES.NETWORK, fn: () => this.syncNetwork() },
        { timestamp: 0, interval: 10000, async: true, showLoading: false, running: false, name: DATASYNCTYPES.ACCOUNTS, fn: () => this.syncAccounts() },
        { timestamp: 0, interval: 10000, async: true, showLoading: false, running: false, name: DATASYNCTYPES.STAKING, fn: () => this.syncStaking() },
        { timestamp: 0, interval: 10000, async: true, showLoading: false, running: false, name: DATASYNCTYPES.BLOCKCHAIN, fn: () => this.syncBlockchain() },
        { timestamp: 0, interval: 10000, async: true, showLoading: false, running: false, name: DATASYNCTYPES.TRANSACTIONS, fn: () => this.syncTransactions() },
        { timestamp: 0, interval: 10000, async: false, showLoading: false, running: false, name: DATASYNCTYPES.PEERSLIST, fn: () => this.getPeersList() },
        { timestamp: 0, interval: 10000, async: true, showLoading: false, running: false, name: DATASYNCTYPES.ADDRESSBOOK, fn: () => this.getAddressBook() },
    ];

    @Output() accountsUpdated: ReplaySubject<boolean> = new ReplaySubject();
    @Output() masternodeListUpdated: EventEmitter<any> = new EventEmitter();
    @Output() encryptionStatusChanges: EventEmitter<any> = new EventEmitter();
    @Output() transactionsUpdated: ReplaySubject<any> = new ReplaySubject();
    @Output() newBlockReceived: ReplaySubject<any> = new ReplaySubject();
    @Output() peersUpdated: EventEmitter<any> = new EventEmitter();

    constructor(
        private rpc: RpcService,
        private electron: ElectronService,
        private errorService: ErrorService,
        private desktopNotification: DesktopNotificationService
    ) {
        this.resetState();
        if (electron.isElectron()) this.setupListeners()
    }

    resetState() {
        this.running = false;
        this._transactions = new Array<Transaction>();
        this._accounts = new Array<Account>();
        this.walletInfo = new WalletInfo();
        this.networkInfo = new NetworkInfo();
        this.blockchainStatus = new BlockchainStatus();
        this.stakingStatus = new StakingStatus();
        this._peers = new Array<Peer>();
        this._addressBook = new Array<AddressBookItem>();
    }

    setupListeners() {
        // electron for RPC status
        this.electron.RCPStatusEvent.subscribe((status: { ready: boolean, message: string }) => {
            if (status.ready) this.startSyncService();
            else this.stopSyncService();
        });
    }

    public get balance(): Big {
        return this.walletInfo.totalBalance;
    }

    public get accounts(): Array<Account> {
        return this._accounts.slice();
    }

    public get addressList(): Array<String> {
        let accounts = this.accounts;
        let addressList = [];
        for (let i = 0; i < accounts.length; i++) {
            let account = accounts[i];
            for (let j = 0; j < account.addresses.length; j++) {
                if (addressList.indexOf(account.addresses[j].address) === -1)
                    addressList.push(account.addresses[j].address);
            }
        }
        return addressList
    }

    public get transactions(): Array<Transaction> {
        return this._transactions.slice();
    }

    public get peers(): Array<Peer> {
        return this._peers.slice();
    }

    public get addressBook(): Array<AddressBookItem> {
        return this._addressBook.slice();
    }

    public cleanupTransactions() {
        if (this._transactions.length > 10) {
            const toRemove = this._transactions.length - 10;
            this._transactions.splice(10, toRemove);
        }
    }

    public requestDataSync(type: DATASYNCTYPES) {
        for (let i = 0; i < this.dataSyncs.length; i++) {
            let dataSync = this.dataSyncs[i];
            if (dataSync.name === type && !dataSync.running) {
                dataSync.running = true;
                this.runDataSync(dataSync)
            }
        }
        return null;
    }

    public stopSyncService() {
        if (this.running) {
            this.running = false;
            if (this.syncServiceTimer) clearTimeout(this.syncServiceTimer);
            if (this.conversionSyncTimer) clearTimeout(this.conversionSyncTimer);
            // reset all timestamps so they will re-sync when the core is available
            this.dataSyncs.forEach(ds => {
                ds.timestamp = 0;
            });
        }
    }

    public startSyncService() {
        if (!this.running) {
            this.running = true;
            this.runSyncService();
        }
    }

    // sync data
    private async runDataSync(dataSync) {
        try {
            await dataSync.fn(dataSync);
        } catch (ex) {
            this.errorService.diagnose(ex);
        }
        this.resetDataSync(dataSync);
    }

    private async runSyncService() {
        if (this.running) {
            // run async loaders
            let promises = [];
            for (let i = 0; i < this.dataSyncs.length; i++) {
                let dataSync = this.dataSyncs[i];
                if (!dataSync.running && dataSync.async && this.doRunDataSync(dataSync)) {
                    promises.push(this.runDataSync(dataSync));
                }
            }
            await Promise.all(promises);

            // run sync loaders
            for (let i = 0; i < this.dataSyncs.length; i++) {
                let dataSync = this.dataSyncs[i];
                if (!dataSync.running && !dataSync.async && this.doRunDataSync(dataSync)) {
                    await this.runDataSync(dataSync);
                }
            }

            this.syncServiceTimer = setTimeout(() => this.runSyncService(), 1000);
        }
    }

    private doRunDataSync(dataSync): boolean {
        let diff = new Date().getTime() - dataSync.timestamp;
        if (!dataSync.timestamp || (dataSync.interval > 0 && diff > dataSync.interval)) {
            if (diff > 30 * 60 * 1000) dataSync.showLoading = true;
            else dataSync.showLoading = false;
            dataSync.running = true;
            return true;
        }
        return false;
    }

    private resetDataSync(dataSync) {
        dataSync.showLoading = false;
        dataSync.running = false;
        dataSync.timestamp = this.running ? new Date().getTime() : 0;
    }

    private async syncWallet() {
        let data: any = await this.rpc.requestData(RPCMethods.GETWALLET);
        if (!data.error) {
            // on linux and osx we need to notify the title bar this has
            // changed so it can redraw it
            let encryptionChanged = this.walletInfo.encryption_status !== data.encryption_status
            this.walletInfo.sync(data);
            if (encryptionChanged) this.encryptionStatusChanges.emit()
        }
    }

    private async syncNetwork() {
        let data: any = await this.rpc.requestData(RPCMethods.GETNETWORK);
        if (!data.error) this.networkInfo.sync(data);
    }

    private async syncAccounts() {
        let accountList: any = await this.rpc.requestData(RPCMethods.GETACCOUNTS);
        let newAccountList = new Array<Account>();
        // flag all address as to remove
        this._accounts.forEach(acc => {
            acc.addresses.forEach(addr => addr.removeFromAccount = true)
        })
        // add and update accounts from server
        accountList.forEach(acc => {
            let account = new Account();
            acc.forEach(addr => {
                account.addresses.push(new Address(addr, Helpers.params.matureTime));
            })
            newAccountList.push(account);
            // check if have match
            let hasMatch = false;
            for (let i = 0; i < this._accounts.length; i++) {
                if (this._accounts[i].addresses[0] && this._accounts[i].addresses[0].address === account.addresses[0].address) {
                    this._accounts[i].syncAddresses(account.addresses);
                    hasMatch = true;
                    break;
                }
            }
            if (!hasMatch)
                this._accounts.push(account);
        })

        // remove any accounts that aren't in the new list from the server
        for (let i = 0; i < this._accounts.length; i++) {
            let hasMatch = false;
            for (let j = 0; j < newAccountList.length; j++) {
                if (this._accounts[i].name === newAccountList[j].name) {
                    hasMatch = true;
                    break;
                }
            }
            if (!hasMatch) this._accounts.splice(i--, 1);
            else this._accounts[i].removeRenamedAddresses(); // remove any addresses that have been renamed
        }
        this.accountsUpdated.next();
    }

    private async syncTransactions() {
        let transactionData: any = await this.rpc.requestData(RPCMethods.GETTRANSACTIONS, [20]);
        this.updateTransactions(transactionData);
    }

    private updateTransactions(transactionData) {
        if (transactionData && transactionData.length) {
            // update any changed trx details (confirms, block, etc)
            transactionData.forEach((serverTrx: Transaction) => {
                // check if we have it already
                let hasMatch = false;
                for (let i = 0; i < this._transactions.length; i++) {
                    let localTrx = this._transactions[i];
                    if (
                        localTrx.txId === serverTrx.txId &&
                        localTrx.address === serverTrx.address
                    ) {
                        hasMatch = true;
                        this.transactions[i].update(serverTrx)
                    }
                }
                if (!hasMatch) {
                    this._transactions.push(serverTrx);
                    this.notifyUserNewTransaction(serverTrx);
                }
            })
            // sort by timestamp then address
            this._transactions.sort((a, b) => {
                if (b.time.getTime() < a.time.getTime()) return -1
                if (b.time.getTime() > a.time.getTime()) return 1
                if (b.vout > a.vout) return -1
                return 1;
            });
            // notify UI of change
            this.transactionsUpdated.next();
        }
    }

    private notifyUserNewTransaction(serverTrx: Transaction) {
        // only notify new coins received
        if (serverTrx.category === "Generated" || serverTrx.category === 'Received') {
            // check we have a block height so we don't notify already known transactions
            if (this.walletInfo.startupBlockTime) {
                // check we recieved this after the last time we synced
                if (serverTrx.timestamp.getTime() > this.walletInfo.startupBlockTime) {
                    //  check we aren't notifying a super old one (only notify a week old)
                    let diff = new Date().getTime() - serverTrx.timestamp.getTime();
                    if (diff <= 1000 * 60 * 60 * 24 * 7) {
                        this.desktopNotification.notifyNewTransaction(serverTrx);
                    }
                }
            }
        }
    }

    private async syncStaking() {
        let stakingData: any = await this.rpc.requestData(RPCMethods.GETSTAKING);
        this.stakingStatus.weight = stakingData.weight;
        this.stakingStatus.netStakeWeight = stakingData.netstakeweight;
        this.stakingStatus.enabled = stakingData.enabled;
        this.stakingStatus.staking = stakingData.staking;
        this.getStakingTime(stakingData.expectedtime);
    }

    private async syncBlockchain() {
        let currentBlock = this.blockchainStatus.latestBlockHeight;
        this.blockchainStatus = await this.rpc.requestData(RPCMethods.GETBLOCKCHAIN);
        if (!this.walletInfo.startupBlockTime)
            this.walletInfo.startupBlockTime = this.blockchainStatus.latestBlockTime;
        if (this.blockchainStatus.latestBlockHeight > currentBlock)
            this.newBlockReceived.next()
    }

    private async getPeersList() {
        this._peers = await this.rpc.requestData(RPCMethods.PEERS);
        this.peersUpdated.emit();
    }

    private async getAddressBook() {
        let res = await this.rpc.requestData(RPCMethods.ADDRESSBOOKLIST);
        if (!res.error) this._addressBook = res
    }
    // end sync data

    // tunnel methods
    public addressBookAdd(address: string, label: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                for (let i = 0; i < this._addressBook.length; i++) {
                    if (this._addressBook[i].address === address) return true;
                }
                await this.rpc.requestData(RPCMethods.ADDRESSBOOKADD, [address, label]);
                // add address to addressbook
                this._addressBook.push({ address: address, label: label });
                resolve();
            } catch (ex) {
                reject(ex);
            }
        })
    }

    public addressBookRemove(address: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.rpc.requestData(RPCMethods.ADDRESSBOOKREMOVE, [address]);
                // remove address to addressbook
                for (let i = 0; i < this._addressBook.length; i++) {
                    if (this._addressBook[i].address === address) {
                        this._addressBook.splice(i, 1);
                        break;
                    }
                }
                resolve();
            } catch (ex) {
                reject(ex);
            }
        })
    }

    public getTransactions(count, skip): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                let transactionData: any = await this.rpc.requestData(RPCMethods.GETTRANSACTIONS, [count, skip]);
                this.updateTransactions(transactionData);
                resolve();
            } catch (ex) {
                reject(ex);
            }
        })
    }

    public getBlock(hash: string): Promise<any> {
        return this.rpc.requestData(RPCMethods.GETBLOCK, [hash]);
    }

    public async getBlockByNumber(height: number): Promise<any> {
        let blockHash = await this.rpc.requestData(RPCMethods.GETBLOCKHASH, [height]);
        return this.rpc.requestData(RPCMethods.GETBLOCK, [blockHash]);
    }

    public getTransaction(hash: string): Promise<any> {
        return this.rpc.requestData(RPCMethods.GETTRANSACTION, [hash, true]);
    }

    public signMessage(address: string, message: string, passphrase: string): Promise<any> {
        return this.rpc.requestData(RPCMethods.SIGNMESSAGE, [address, message, passphrase]);
    }

    public verifyMessage(address: string, message: string, signature: string): Promise<any> {
        return this.rpc.requestData(RPCMethods.VERIFYMESSAGE, [address, signature, message]);
    }

    public backupWallet(location: string): Promise<any> {
        return this.rpc.requestData(RPCMethods.BACKUPWALLET, [location]);
    }

    public changePassphrase(current: string, passphrase: string): Promise<any> {
        return this.rpc.requestData(RPCMethods.CHANGEPASSPHRASE, [current, passphrase]);
    }

    public encryptWallet(passphrase: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.rpc.requestData(RPCMethods.ENCRYPT, [passphrase]);
                this.walletInfo.encryption_status = EncryptionStatus.ENCRYPTING;
                this.encryptionStatusChanges.emit()
                resolve()
            } catch (ex) {
                reject(ex);
            }
        })
    }

    public sendTransaction(inputs: any, outputs: any, fee: number, passphrase: string, changeAddress: string): Promise<any> {
        return this.rpc.requestData(RPCMethods.CREATETRANSACTION, [inputs, outputs, fee, passphrase, changeAddress]);
    }

    public updateAddressAccount(address: Address): Promise<any> {
        return this.rpc.requestData(RPCMethods.UPDATELABEL, [address.address, address.newAccount]);
    }

    public getNewAddress(account: string): Promise<any> {
        return this.rpc.requestData(RPCMethods.NEWADDRESS, [account]);
    }

    public unlock(passphrase: string, stakingOnly: boolean = true): Promise<any> {
        return this.rpc.requestData(RPCMethods.UNLOCK, [passphrase, stakingOnly]);
    }

    public lockWallet(): void {
        // we'll handle the lock wallet error here so it's cleaner
        // the UI will never need to handle these errors
        try {
            this.walletInfo.encryption_status = EncryptionStatus.LOCKED;
            this.stakingStatus.staking = false;
            this.encryptionStatusChanges.emit()
            this.rpc.requestData(RPCMethods.LOCK);
        } catch (ex) {
            this.errorService.diagnose(ex);
        }
    }

    public lockUnspent(unlock: boolean, input: Input): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                let res = await this.rpc.requestData(RPCMethods.LOCKUNSPENT, [unlock, [{ txid: input.txid, vout: input.vout }]]);
                if (res === true) input.locked = !unlock;
                if (input.locked) input.selected = false;
                resolve()
            } catch (ex) {
                reject(ex);
            }
        })
    }

    // end tunnel methods

    // public methods
    public requireUnlock() {
        switch (this.walletInfo.encryption_status) {
            case EncryptionStatus.LOCKED:
            case EncryptionStatus.LOCKEDFORSTAKING:
                return true;
            case EncryptionStatus.UNLOCKED:
            case EncryptionStatus.UNENCRYPTED:
                return false;
        }
    }

    public canLock() {
        switch (this.walletInfo.encryption_status) {
            case EncryptionStatus.LOCKED:
            case EncryptionStatus.UNENCRYPTED:
                return false;
            case EncryptionStatus.LOCKEDFORSTAKING:
            case EncryptionStatus.UNLOCKED:
                return true;
        }
    }

    public canUnlock() {
        switch (this.walletInfo.encryption_status) {
            case EncryptionStatus.UNLOCKED:
            case EncryptionStatus.UNENCRYPTED:
                return false;
            case EncryptionStatus.LOCKED:
            case EncryptionStatus.LOCKEDFORSTAKING:
                return true;
        }
    }

    public get staking() {
        switch (this.walletInfo.encryption_status) {
            case EncryptionStatus.UNLOCKED:
            case EncryptionStatus.UNENCRYPTED:
            case EncryptionStatus.LOCKEDFORSTAKING:
                return true;
            case EncryptionStatus.LOCKED:
                return false;
        }
    }

    public getTrxProgress(trx) {
        let progress = Math.round(trx.confirmations / Helpers.params.confirmations * 100);
        let indicator = {
            "left": "0"
        }
        if (progress > 0 && progress < 100) {
            indicator["left"] = progress + "%";
        }
        return indicator;
    }

    public getAccounts(hideEmpty: boolean = false) {
        if (!hideEmpty) hideEmpty = this.accountFilters.hideEmptyAccounts;
        let accList = new Array<Account>();
        let accounts = this._accounts;
        accounts.forEach(acc => {
            if (acc.name !== 'Unnamed' || acc.balance > 0 || !hideEmpty)
                accList.push(acc);
        })
        if (hideEmpty && !accList.length && accounts.length) accList.push(accounts[0]);

        // sort by name then balance
        return accList.sort((a: Account, b: Account) => {
            const s1 = a.name !== 'Unnamed' ? a.name.toLowerCase() : 'z';
            const s2 = b.name !== 'Unnamed' ? b.name.toLowerCase() : 'z';
            const s3 = Number(a.balance);
            const s4 = Number(b.balance);
            if (s1 > s2) return 1;
            if (s1 < s2) return -1;
            if (s3 > s4) return 1;
            if (s3 < s4) return -1;
            return 0;
        })

    }

    public getStakingTime(returnTime: number) {
        if (!returnTime) {
            this.stakingStatus.expectedTime = 0;
            this.stakingStatus.expectedType = '';
            return;
        }

        // check seconds
        if (returnTime > 60) {
            returnTime = returnTime / 60;
        } else {
            this.stakingStatus.expectedTime = returnTime;
            this.stakingStatus.expectedType = 'seconds';
            return;
        }
        // check minutes
        if (returnTime > 60) {
            returnTime = returnTime / 60;
        } else {
            this.stakingStatus.expectedTime = Math.floor(returnTime);
            this.stakingStatus.expectedType = 'minutes';
            return;
        }
        // check hours
        if (returnTime > 60) {
            returnTime = returnTime / 24;
        } else {
            this.stakingStatus.expectedTime = Math.floor(returnTime);
            this.stakingStatus.expectedType = 'hours';
            return;
        }

        // return days
        this.stakingStatus.expectedTime = Math.floor(returnTime);
        this.stakingStatus.expectedType = 'days';
    }

    public getWeight() {
        if (this.stakingStatus) {
            return Math.floor(Helpers.fromSatoshi(this.stakingStatus.weight) as number);
        }
        return 0;
    }

    public getNetWeight() {
        if (this.stakingStatus) {
            return Math.floor(Helpers.fromSatoshi(this.stakingStatus.netStakeWeight) as number);
        }
        return 0;
    }
    // end public methods
}

export enum DATASYNCTYPES {
    WALLET,
    NETWORK,
    ACCOUNTS,
    TRANSACTIONS,
    STAKING,
    BLOCKCHAIN,
    PEERSLIST,
    ADDRESSBOOK
}

export class MarketData {
    rank: number = 0;
    change_24hr: number = 0;
    change_7day: number = 0;
    change_14day: number = 0;
    marketCap: number = 0;
    totalSupply: number = 0;
    price: number = 0;


    constructor(marketData?: any) {
        if (marketData) {
            this.rank = marketData.market_cap_rank;
            this.change_24hr = Math.round(Number(marketData.market_data.price_change_percentage_24h) * 100) / 100;
            this.change_7day = Math.round(Number(marketData.market_data.price_change_percentage_7d) * 100) / 100;
            this.change_14day = Math.round(Number(marketData.market_data.price_change_percentage_14d) * 100) / 100;
            this.marketCap = Math.round(marketData.market_data.market_cap.usd);
            this.price = marketData.market_data.current_price.usd;
            this.totalSupply = Math.round(Number(marketData.market_data.circulating_supply));
        }
    }
}