import { Injectable, isDevMode } from '@angular/core';
import Big from 'big.js';
import { ElectronService, ClientStatus } from './electron.service';
import { PromptService } from '../components/prompt/prompt.service';
import Helpers from '../helpers';

@Injectable()
export class RpcService {
    private encryptionStatus = 'Unencrypted';
    public clientStatus: ClientStatus;
    public RPCReady = false
    public RPCWarmupMessage = '';

    private RPCSubscriptions = {};

    private readonly unlockTimeout = 31000000;

    constructor(
        private electron: ElectronService,
        private prompt: PromptService
    ) {
        if (electron.isElectron()) this.setupListeners()
        else console.log("Not running in electron. cannot connect IPC");
    }

    setupListeners() {
        // electron for client status
        this.electron.clientStatusEvent.subscribe((status: ClientStatus) => {
            this.clientStatus = status;
            if (status === ClientStatus.CLOSEDUNEXPECTED) {
                this.stopClient();
                this.notifyClientCloseUnexpected();
            } else if (status === ClientStatus.STOPPED && this.RPCReady) {
                this.stopClient();
                this.notifyClientStopped();
            } else if (status === ClientStatus.INVALIDMASTERNODECONFIG) {
                this.stopClient();
                this.notifyClientInvalidConfig();
            } else if (status === ClientStatus.SHUTTINGDOWN) {
                this.stopClient();
            }
        });
        // electron for RPC status
        this.electron.RCPStatusEvent.subscribe((status: { ready: boolean, message: string }) => {
            this.RPCReady = status.ready;
            this.RPCWarmupMessage = status.message
        });
        // listen for RPC responses
        this.electron.RPCResponseEvent.subscribe(data => {
            let sub = this.RPCSubscriptions[data.callId];
            if (sub) {
                let result = data.result;
                let time = new Date().getTime() - sub.ts + 'ms';
                if (isDevMode()) console.log('CallServer Response', time, data.method, result);
                if (result.success) sub.resolve(result.body);
                else sub.reject(result);
                delete this.RPCSubscriptions[data.callId]
            }
        });
    }

    public stopClient() {
        this.RPCReady = false;
        this.cancelAllRPCCalls();
    }

    public restartClient(commands = []) {
        this.stopClient();
        this.electron.ipcRenderer.send('client-node', 'RESTART', commands);
    }

    public async requestData(method, params = []) {
        let data: any;
        switch (method) {
            case RPCMethods.ENCRYPT:
                data = await this.callServer("encryptwallet", params);
                break;
            case RPCMethods.CHANGEPASSPHRASE:
                data = await this.callServer("walletpassphrasechange", params);
                break;
            case RPCMethods.GETWALLET:
                data = await this.getWalletInfo();
                break;
            case RPCMethods.GETACCOUNTS:
                data = await this.getAccounts();
                break;
            case RPCMethods.GETTRANSACTIONS:
                data = await this.getTransactions(params);
                break;
            case RPCMethods.GETSTAKING:
                data = await this.callServer("getstakinginfo");
                break;
            case RPCMethods.UPDATELABEL:
                data = await this.callServer("setaccount", params);
                break;
            case RPCMethods.NEWADDRESS:
                data = await this.callServer("getaccountaddress", params);
                break;
            case RPCMethods.UNLOCK:
                data = await this.unlockWallet(params[0], this.unlockTimeout, params[1]);
                break;
            case RPCMethods.LOCK:
                await this.callServer("walletlock");
                data = { result: { success: true } };
                break;
            case RPCMethods.LOCKUNSPENT:
                data = await this.callServer("lockunspent", params);
                break;
            case RPCMethods.CREATETRANSACTION:
                data = await this.createTransaction(params);
                break;
            case RPCMethods.BACKUPWALLET:
                data = await this.callServer("backupwallet", params);
                break;
            case RPCMethods.GETLATESTBLOCK:
                data = await this.getLatestBlock();
                break;
            case RPCMethods.MASTERNODESTART:
                data = await this.callServer("masternode", ['start', ...params])
                break;
            case RPCMethods.MASTERNODESTARTALIAS:
                data = await this.callServer("masternode", ['start-alias', ...params])
                break;
            case RPCMethods.MASTERNODESTARTMANY:
                data = await this.callServer("masternode", ['start-many', ...params])
                break;
            case RPCMethods.MASTERNODESTATUS:
                data = await this.masternodeStatus();
                break;
            case RPCMethods.MASTERNODESTATUSALL:
                data = await this.callServer("masternode", ['status-all']);
                break;
            case RPCMethods.MASTERNODELISTCONF:
                data = await this.callServer("masternode", ['list-conf']);
                break;
            case RPCMethods.SIGNMESSAGE:
                data = await this.signMessage(params);
                break;
            case RPCMethods.VERIFYMESSAGE:
                data = await this.callServer("verifymessage", params);
                break;
            case RPCMethods.PEERS:
                data = await this.callServer("getpeerinfo");
                break;
            case RPCMethods.ADDRESSBOOKLIST:
                data = await this.callServer("listaddressbook");
                break;
            case RPCMethods.ADDRESSBOOKADD:
                data = await this.callServer("addressbookadd", params);
                break;
            case RPCMethods.ADDRESSBOOKREMOVE:
                data = await this.callServer("addressbookremove", params);
                break;
            case RPCMethods.GETBLOCK:
                data = await this.callServer("getblock", params);
                break;
            case RPCMethods.GETBLOCKBYNUMBER:
                data = await this.callServer("getblockbynumber", params);
                break;
            case RPCMethods.GETTRANSACTION:
                data = await this.callServer("gettransaction", params);
                break;
        }
        return data.result ? data.result : {};
    }

    private async unlockWallet(passphrase, timeout, stakingOnly = false) {
        try {
            const lockdata: any = await this.callServer("walletpassphrase", [passphrase, timeout, stakingOnly]);
            return lockdata;
        } catch (ex) {
            // if we called unlock when our wallet is already unlock or
            // unencrypted just ignore it
            if (ex.error.error.code === -15 || ex.error.error.code === -17)
                return {}
            else
                throw ex
        }
    }

    private async signMessage(params) {
        const [address, message, passphrase] = params;
        try {
            await this.unlockWallet(passphrase, 5);
            const signdata: any = await this.callServer("signmessage", [address, message]);
            this.checkUnlock(passphrase);
            return signdata;
        } catch (ex) {
            this.checkUnlock(passphrase);
            throw ex;
        }
    }

    private async getLatestBlock() {
        let result = { height: 0, time: 0 };
        let data: any = await this.callServer('getbestblockhash');
        data = await this.callServer('getblock', [data.result]);
        result.height = data.result.height;
        result.time = data.result.time;
        return { result };
    }

    private async getAccounts() {
        // get addresses
        let addresses: any = await this.callServer("listreceivedbyaddress", [0, true]);
        // get address groupings
        let groups: any = await this.callServer("listaddressgroupings");
        // get all unspent
        let unspents: any = await this.callServer("listunspent", [1, 9999999, [], true]);
        // assemble accounts
        let accounts = [];
        for (let i = 0; i < groups.result.length; i++) {
            let grp = groups.result[i];
            let newAccount = [];
            for (let j = 0; j < grp.length; j++) {
                let newAddress = {
                    address: grp[j][0],
                    amount: grp[j][1],
                    account: grp[j][2],
                    unspents: []
                }
                if (newAddress.account && newAccount.length) accounts.push([newAddress]);
                else newAccount.push(newAddress);
                // removing matching address in address list
                for (let k = 0; k < addresses.result.length; k++) {
                    if (addresses.result[k].address === newAddress.address) {
                        addresses.result.splice(k, 1);
                        break;
                    }
                }
            }
            accounts.push(newAccount);
        }
        // add remaining addresses from address list
        addresses.result.forEach(address => {
            if (address.account !== "(change)" || (address.account === "(change)" && address.amount !== "0")) {
                accounts.push([{
                    address: address.address,
                    amount: address.amount,
                    account: address.account,
                    unspents: []
                }]);
            }
        });
        // match unspent to address
        for (let i = 0; i < unspents.result.length; i++) {
            let unspent = unspents.result[i];
            for (let j = 0; j < accounts.length; j++) {
                let acc = accounts[j];
                let foundAddr = false;
                for (let k = 0; k < acc.length; k++) {
                    let addr = acc[k];
                    if (addr.address === unspent.address) {
                        addr.unspents.push({
                            amount: unspent.amount,
                            blockTime: unspent.time,
                            confirmations: unspent.confirmations,
                            scriptPubKey: unspent.scriptPubKey,
                            txid: unspent.txid,
                            vout: unspent.vout,
                            locked: unspent.locked
                        });
                        unspents.result.splice(i--, 1);
                        foundAddr = true;
                        break;
                    }
                }
                if (foundAddr) break;
            }
        }

        // remove empty change addresses
        for (let i = 0; i < accounts.length; i++) {
            let acc = accounts[i];
            for (let j = 0; j < acc.length; j++) {
                let addr = acc[j];
                if (addr.account === '(change)' && !addr.unspents.length) {
                    acc.splice(j--, 1);
                }
            }
            if (!acc.length) accounts.splice(i--, 1);
        }

        return { result: accounts };
    }

    private async getWalletInfo() {
        let data: any = await this.callServer("getinfo");

        if (!data.result.unlocked_until || (new Date().getTime() - data.result.unlocked_until * 1000) > 10 * 1000)
            this.encryptionStatus = data.result.encryption_status

        return data;
    }

    private async createTransaction(params) {
        let [inputs, outputs, fee, passphrase, changeAddress] = params;
        try {
            // get unspents
            let unspents: any = await this.callServer("listunspent", [1, 9999999, [], true]);
            unspents = unspents.result;
            // safety check inputs
            let sendingBalance = Big(0);
            for (let i = 0; i < inputs.length; i++) {
                let input = inputs[i];
                let foundMatch = false;
                for (let j = 0; j < unspents.length; j++) {
                    let unspent = unspents[j];
                    if (input.txid === unspent.txid && input.vout === unspent.vout) {
                        if (unspent.confirmations < 1) {
                            return { result: { success: false, error: "NOTIFICATIONS.MINIMUMCONFIRMATIONS" } };
                        }
                        foundMatch = true;
                        sendingBalance = sendingBalance.add(Big(unspent.amount));
                        break;
                    }
                }
                if (!foundMatch) return { result: { success: false, error: "NOTIFICATIONS.TRANSACTIONMISMATCH" } };
            }
            // get total receving
            let recevingBalance = Big(fee);
            Object.keys(outputs).forEach(key => {
                recevingBalance = recevingBalance.add(Big(outputs[key]));
            })
            // safety check
            if (sendingBalance.lt(recevingBalance)) {
                return { result: { success: false, error: "NOTIFICATIONS.TRANSACTIONMISMATCH" } };
            }
            // calculate change
            let change = Number(sendingBalance.minus(recevingBalance).toString());

            // unlock wallet
            if (passphrase) await this.unlockWallet(passphrase, 5);
            // create change address
            if (change > 0) {
                if (!changeAddress) {
                    let changeRequest: any = await this.callServer("getnewaddress", ['(change)']);
                    changeAddress = changeRequest.result;
                }
                if (outputs[changeAddress]) {
                    let outputAmount = Big(outputs[changeAddress]).add(change);
                    outputs[changeAddress] = Number(outputAmount.toString());
                }
                else outputs[changeAddress] = change;
            }
            // create raw transaction
            let raw: any = await this.callServer("createrawtransaction", [inputs, outputs]);
            raw = raw.result;
            // sign raw transaction
            let signed: any = await this.callServer("signrawtransaction", [raw]);
            this.checkUnlock(passphrase);
            signed = signed.result.hex;
            // send raw transaction
            await this.callServer("sendrawtransaction", [signed]);
            return { result: { success: true } };
        } catch (ex) {
            this.checkUnlock(passphrase);
            throw ex;
        }
    }

    private checkUnlock(passphrase) {
        try {
            if (this.encryptionStatus === 'LockedForStaking')
                this.unlockWallet(passphrase, this.unlockTimeout, true)
            else if (this.encryptionStatus === 'Unlocked')
                this.unlockWallet(passphrase, this.unlockTimeout)
        } catch (ex) {

        }
    }

    private async getTransactions(params) {
        let outputs = new Array<Transaction>();
        let count = params[0] || 10;
        let from = params[1] || 0;

        // load all transactions
        let data: any = await this.callServer('listtransactions', ['*', count, from]);
        // get address
        data.result.forEach(tx => {
            outputs.push(new Transaction(tx))
        })

        // group payments to self
        outputs.forEach((output, index) => {
            for (let i = index + 1; i < outputs.length; i++) {
                if (
                    output.address === outputs[i].address &&
                    output.timestamp === outputs[i].timestamp &&
                    Big(output.amount.replace("-", "")).eq(Big(outputs[i].amount.replace("-", "")))
                ) {
                    output.amount = output.amount.replace("-", "");
                    output.category = "Payment To Self";
                    output.fee = output.fee || outputs[i].fee;
                    outputs.splice(i, 1);
                    break;
                }
            }
        })

        return { result: outputs };
    }

    private async masternodeStatus() {
        // check initialised
        let init: any = await this.callServer("masternode", ['isInit']);
        return { result: { initRequired: !init.result } };
    }

    public callServer(method, params = []) {
        return new Promise((resolve, reject) => {
            let callId = Helpers.guid();
            this.RPCSubscriptions[callId] = { resolve, reject, ts: new Date().getTime() };
            const callData = { callId, method, params }
            this.electron.ipcRenderer.send('client-node', 'CALLCLIENT', callData);
        })
    }

    cancelAllRPCCalls() {
        Object.keys(this.RPCSubscriptions).forEach(key => {
            this.RPCSubscriptions[key].reject({ rpcCancelled: true });
        })
        this.RPCSubscriptions = {};
    }

    async notifyClientStopped() {
        // if we lost connection to external client. notify user
        try {
            await this.prompt.alert('COMPONENTS.PROMPT.CLIENTSTOPPEDTITLE', 'COMPONENTS.PROMPT.CLIENTSTOPPEDINFO', 'COMPONENTS.PROMPT.CLIENTSTOPPEDBUTTONSTART', 'COMPONENTS.PROMPT.CLIENTSTOPPEDBUTTONEXIT');
            // start internal client
            this.restartClient();
        } catch (ex) {
            // chose to stop wallet
            this.electron.remote.app.quit()
        }
    }

    async notifyClientCloseUnexpected() {
        try {
            await this.prompt.alert('COMPONENTS.PROMPT.CLIENTCLOSEDUNEXPECTEDTITLE', 'COMPONENTS.PROMPT.CLIENTCLOSEDUNEXPECTEDINFO', 'COMPONENTS.PROMPT.CLIENTCLOSEDUNEXPECTEDBUTTONSTART', 'COMPONENTS.PROMPT.CLIENTSTOPPEDBUTTONEXIT');
            // restart internal client
            this.restartClient();
        } catch (ex) {
            // chose to stop wallet
            this.electron.remote.app.quit()
        }
    }

    async notifyClientInvalidConfig() {
        // if we tried starting the client but the config has a bad masternode setup
        // that will just cause the client to exit
        try {
            await this.prompt.alert('COMPONENTS.PROMPT.CLIENTINVALIDCONFIGTITLE', 'COMPONENTS.PROMPT.CLIENTINVALIDCONFIGINFO', 'COMPONENTS.PROMPT.CLIENTSTOPPEDBUTTONSTART', 'COMPONENTS.PROMPT.CLIENTSTOPPEDBUTTONEXIT');
            // start internal client
            this.restartClient();
        } catch (ex) {
            // chose to stop wallet
            this.electron.remote.app.quit()
        }
    }
}

export class Transaction {
    account: string;
    address: string;
    category: string;
    subCategory: string;
    amount: string;
    fee: number;
    confirmations: number
    blockHash: string;
    blockIndex: number;
    blockTime: number;
    txId: string;
    timestamp: number;

    constructor(data: any) {
        this.account = data.account;
        this.address = data.address;
        this.category = data.category;
        this.subCategory = data.subcategory;
        this.amount = data.amount.toString();
        this.fee = data.fee;
        this.confirmations = data.confirmations;
        this.blockHash = data.blockhash;
        this.blockIndex = data.blockindex;
        this.blockTime = data.blocktime;
        this.txId = data.txid;
        this.timestamp = data.time;
        // santise subcategory
        if (this.subCategory === "mined") this.subCategory = "Mined"
        if (this.subCategory === "minted") this.subCategory = "Minted"
        if (this.subCategory === "masternode reward") this.subCategory = "Masternode Reward"
        // santise category
        if (this.category === "send") this.category = "Payment"
        if (this.category === "generate") this.category = "Generated"
        if (this.category === "receive") this.category = "Received"
        if (this.category === "immature") this.category = "Immature"
        if (this.category === "orphan") this.category = "Orphan"
    }
}

export enum RPCMethods {
    ENCRYPT,
    CHANGEPASSPHRASE,
    GETWALLET,
    GETACCOUNTS,
    GETTRANSACTIONS,
    GETTOTALS,
    GETSTAKING,
    UPDATELABEL,
    NEWADDRESS,
    UNLOCK,
    LOCK,
    LOCKUNSPENT,
    CREATETRANSACTION,
    GETLATESTBLOCK,
    MASTERNODESTART,
    MASTERNODESTARTMANY,
    MASTERNODESTARTALIAS,
    MASTERNODESTATUS,
    MASTERNODESTATUSALL,
    MASTERNODELISTCONF,
    BACKUPWALLET,
    SIGNMESSAGE,
    VERIFYMESSAGE,
    PEERS,
    ADDRESSBOOKLIST,
    ADDRESSBOOKADD,
    ADDRESSBOOKREMOVE,
    GETBLOCK,
    GETBLOCKBYNUMBER,
    GETTRANSACTION
}