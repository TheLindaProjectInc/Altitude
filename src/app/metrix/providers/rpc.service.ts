import { Injectable, isDevMode } from '@angular/core';
import Big from 'big.js';
import { ElectronService } from 'app/providers/electron.service';
import { PromptService } from '../../components/prompt/prompt.service';
import Helpers from 'app/helpers';
import { Transaction } from '../classes';
import { BlockchainStatus } from '../classes/blockchainStatus';
import { Router } from '@angular/router';
import { ClientStatus } from 'app/enum';

@Injectable()
export class RpcService {
    private encryptionStatus = 'Unencrypted';
    public clientStatus: ClientStatus;
    public RPCReady = false
    public RPCWarmupMessage = '';
    public recoveryMode = false;

    private RPCSubscriptions = {};

    // set to try when we are unlocking the wallet temporarily to access keys
    // so we can return it to it's original state
    private isUsingEncryption = false;

    private readonly unlockTimeout = 31000000;

    private rpcMethods = [
        { name: RPCMethods.ADDRESSBOOKADD, fn: (params) => this.callServer("addressbookadd", params) },
        { name: RPCMethods.ADDRESSBOOKLIST, fn: (params) => this.callServer("listaddressbook") },
        { name: RPCMethods.ADDRESSBOOKREMOVE, fn: (params) => this.callServer("addressbookremove", params) },
        { name: RPCMethods.BACKUPWALLET, fn: (params) => this.callServer("backupwallet", params) },
        { name: RPCMethods.CALLCONTRACT, fn: (params) => this.callServer("callcontract", params) },
        { name: RPCMethods.CHANGEPASSPHRASE, fn: (params) => this.callServer("walletpassphrasechange", params) },
        { name: RPCMethods.CREATETRANSACTION, fn: (params) => this.createTransaction(params) },
        { name: RPCMethods.ENCRYPT, fn: (params) => this.callServer("encryptwallet", params) },
        { name: RPCMethods.GETACCOUNTS, fn: (params) => this.getAccounts() },
        { name: RPCMethods.GETBLOCK, fn: (params) => this.callServer("getblock", params) },
        { name: RPCMethods.GETBLOCKCHAIN, fn: (params) => this.getBlockchain() },
        { name: RPCMethods.GETBLOCKHASH, fn: (params) => this.callServer("getblockhash", params) },
        { name: RPCMethods.GETDGPINFO, fn: (params) => this.callServer("getdgpinfo") },
        { name: RPCMethods.TOHEXADDRESS, fn: (params) => this.callServer("gethexaddress", params) },
        { name: RPCMethods.FROMHEXADDRESS, fn: (params) => this.callServer("fromhexaddress", params) },
        { name: RPCMethods.GETNETWORK, fn: (params) => this.callServer("getnetworkinfo") },
        { name: RPCMethods.GETSTAKING, fn: (params) => this.callServer("getstakinginfo") },
        { name: RPCMethods.GETTRANSACTION, fn: (params) => this.callServer("getrawtransaction", params) },
        { name: RPCMethods.GETTRANSACTIONS, fn: (params) => this.getTransactions(params) },
        { name: RPCMethods.GETWALLET, fn: (params) => this.getWalletInfo() },
        { name: RPCMethods.LOCK, fn: (params) => this.lockWallet() },
        { name: RPCMethods.LOCKUNSPENT, fn: (params) => this.callServer("lockunspent", params) },
        { name: RPCMethods.NEWADDRESS, fn: (params) => this.callServer("getnewaddress", params) },
        { name: RPCMethods.PEERS, fn: (params) => this.callServer("getpeerinfo") },
        { name: RPCMethods.SENDTOCONTRACT, fn: (params) => this.callServer('sendtocontract', params) },
        { name: RPCMethods.SIGNMESSAGE, fn: (params) => this.signMessage(params) },
        { name: RPCMethods.UNLOCK, fn: (params) => this.unlockWallet(params[0], this.unlockTimeout, params[1]) },
        { name: RPCMethods.UPDATELABEL, fn: (params) => this.callServer("setlabel", params) },
        { name: RPCMethods.VERIFYMESSAGE, fn: (params) => this.callServer("verifymessage", params) },
    ];

    constructor(
        private electron: ElectronService,
        private prompt: PromptService,
        private router: Router,
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
            } else if (status === ClientStatus.UNKNOWNERROR) {
                console.log('rec UNKNOWNERROR')
                this.stopClient();
                this.notifyClientUnknownError();
            } else if (status === ClientStatus.SHUTTINGDOWN) {
                this.stopClient();
            } else if (status === ClientStatus.BOOTSTRAPFAILED) {
                this.notifyBootstrapFailed();
            } else if (status === ClientStatus.INVALIDHASH || status === ClientStatus.DOWNLOADFAILED || status === ClientStatus.UNSUPPORTEDPLATFORM) {
                this.stopClient();
                this.notifyStartupFailed();
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

    public bootstrapClient() {
        this.stopClient();
        this.electron.ipcRenderer.send('client-node', 'BOOTSTRAP');
    }

    public resyncClient() {
        this.stopClient();
        this.electron.ipcRenderer.send('client-node', 'RESYNC');
    }

    public reinstallClient() {
        this.stopClient();
        this.electron.ipcRenderer.send('client-node', 'REINSTALL');
    }

    public async requestData(method, params = []) {
        let call = this.rpcMethods.find((rpcMethod) => {
            return rpcMethod.name === method;
        })
        if (!call) throw "Unknown RPC call"
        let data: any = await call.fn(params);
        return data.result ? data.result : {};
    }

    private async unlockWallet(passphrase, timeout, stakingOnly = false) {
        try {
            const lockdata: any = await this.callServer("walletpassphrase", [passphrase, timeout, stakingOnly]);
            return lockdata;
        } catch (ex) {
            // if we called unlock when our wallet is already unlock or
            // unencrypted just ignore it
            if (ex.body.error.code === -15 || ex.body.error.code === -17)
                return {}
            else
                throw ex
        }
    }

    public async unlockWalletForCommand(passphrase: string) {
        if (passphrase) {
            await this.unlockWallet(passphrase, 5);
            this.isUsingEncryption = true;
        }
    }

    private async lockWallet() {
        await this.callServer("walletlock");
        return { result: { success: true } };
    }

    private async signMessage(params) {
        const [address, message, passphrase] = params;
        try {
            await this.unlockWalletForCommand(passphrase);
            const signdata: any = await this.callServer("signmessage", [address, message]);
            this.lockWalletAfterCommand(passphrase);
            return signdata;
        } catch (ex) {
            this.lockWalletAfterCommand(passphrase);
            throw ex;
        }
    }

    private async getBlockchain() {
        let result = new BlockchainStatus();
        // get blockchain info
        let blockchainInfo: any = await this.callServer('getblockchaininfo');
        result.latestBlockHeight = blockchainInfo.result.blocks;
        result.headers = blockchainInfo.result.headers;
        result.syncProgresss = blockchainInfo.result.verificationprogress * 100;
        result.latestBlockHash = blockchainInfo.result.bestblockhash;
        result.chain = blockchainInfo.result.chain;
        // get block time
        let blockInfo: any = await this.callServer('getblock', [result.latestBlockHash]);
        result.latestBlockTime = blockInfo.result.time * 1000;
        // return 
        return { result };
    }

    private async getAccounts() {
        // get addresses
        let addresses: any = await this.callServer("listreceivedbyaddress", [0, true, true]);
        // get address groupings
        let groups: any = await this.callServer("listaddressgroupings");
        // get all unspent
        let unspents: any = await this.listUnspent();
        // assemble accounts
        let accounts = [];
        for (let i = 0; i < groups.result.length; i++) {
            let grp = groups.result[i];
            let newAccount = [];
            for (let j = 0; j < grp.length; j++) {
                let newAddress = {
                    address: grp[j][0],
                    amount: 0,
                    account: grp[j][2],
                    unspents: [],
                    watchOnly: false
                }
                if (newAddress.account !== undefined && newAccount.length) accounts.push([newAddress]);
                else newAccount.push(newAddress);
                // removing matching address in address list
                for (let k = 0; k < addresses.result.length; k++) {
                    if (addresses.result[k].address === newAddress.address) {
                        // set watch only
                        newAddress.watchOnly = addresses.result[k].involvesWatchonly === true
                        addresses.result.splice(k, 1);
                        break;
                    }
                }
            }
            accounts.push(newAccount);
        }
        // add remaining addresses from address list
        addresses.result.forEach(address => {
            if (address.label !== "(change)" || (address.label === "(change)" && address.amount !== "0")) {
                accounts.push([{
                    address: address.address,
                    amount: address.amount,
                    account: address.label,
                    unspents: [],
                    watchOnly: address.involvesWatchonly === true
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
                            amount: Helpers.fromSatoshi(Big(unspent.rawamount)) || unspent.amount,
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
        let data: any = await this.callServer("getwalletinfo");

        if (!this.isUsingEncryption)
            this.encryptionStatus = data.result.encryption_status

        return data;
    }

    private listUnspent() {
        return this.callServer("listunspent");
    }

    private async createTransaction(params) {
        let [inputs, outputs, fee, passphrase, changeAddress] = params;
        try {
            // get unspents
            let unspents: any = await this.listUnspent();
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
                        let unspentAmount = Helpers.fromSatoshi(Big(unspent.rawamount)) || Big(unspent.amount);
                        sendingBalance = sendingBalance.add(unspentAmount);
                        break;
                    }
                }
                if (!foundMatch) return { result: { success: false, error: "NOTIFICATIONS.TRANSACTIONMISMATCH" } };
            }
            // get total receiving
            let recevingBalance = Big(fee);
            Object.keys(outputs).forEach(address => {
                recevingBalance = recevingBalance.add(outputs[address]);
            })

            // safety check
            if (sendingBalance.lt(recevingBalance)) {
                return { result: { success: false, error: "NOTIFICATIONS.TRANSACTIONMISMATCH" } };
            }
            // calculate change
            let change = sendingBalance.minus(recevingBalance);
            // unlock wallet
            await this.unlockWalletForCommand(passphrase);
            // create change address
            if (change.gt(0)) {
                if (!changeAddress) {
                    let changeRequest: any = await this.callServer("getrawchangeaddress");
                    changeAddress = changeRequest.result;
                }
                if (outputs[changeAddress])
                    outputs[changeAddress] = outputs[changeAddress].add(change);
                else
                    outputs[changeAddress] = change;
            }

            // create raw transaction
            // convert outputs to string to prevent overflow
            Object.keys(outputs).forEach(key => {
                outputs[key] = outputs[key].toString();
            })
            let raw: any = await this.callServer("createrawtransaction", [inputs, outputs]);
            raw = raw.result;
            // sign raw transaction
            let signed: any = await this.callServer("signrawtransactionwithwallet", [raw]);
            this.lockWalletAfterCommand(passphrase);
            signed = signed.result.hex;
            // confirm the fee
            let actualFee = Big(signed.length).div(2).div(1000).mul(Helpers.params.fee);
            if (actualFee.gt(fee)) {
                return { result: { success: false, newFee: Number(actualFee) } };
            } else {
                // send raw transaction
                await this.callServer("sendrawtransaction", [signed]);
                return { result: { success: true } };
            }
        } catch (ex) {
            this.lockWalletAfterCommand(passphrase);
            throw ex;
        }
    }

    public lockWalletAfterCommand(passphrase) {
        try {
            this.isUsingEncryption = false;
            if (passphrase) {
                if (this.encryptionStatus === 'LockedForStaking')
                    this.unlockWallet(passphrase, this.unlockTimeout, true)
                else if (this.encryptionStatus === 'Unlocked')
                    this.unlockWallet(passphrase, this.unlockTimeout)
            }
        } catch (ex) {

        }
    }

    private async getTransactions(params) {
        let outputs = new Array<Transaction>();
        let count = params[0] || 10;
        let from = params[1] || 0;

        // load all transactions
        let data: any = await this.callServer('listtransactions', ['*', count, from, true])

        // get address
        data.result.forEach(tx => {
            outputs.push(new Transaction(tx))
        })

        // group payments to self
        outputs.forEach((output, index) => {
            for (let i = index + 1; i < outputs.length; i++) {
                // check if payment to self
                if (
                    output.txId === outputs[i].txId &&
                    output.address === outputs[i].address &&
                    output.amount.abs().cmp(outputs[i].amount.abs()) == 0
                ) {
                    output.amount = output.amount.abs()
                    output.category = "Payment To Self";
                    output.fee = output.fee || outputs[i].fee;
                    outputs.splice(i, 1);
                    break;
                }
            }
        })

        return { result: outputs };
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
        // client responsed with unexpected error
        try {
            await this.prompt.alert('COMPONENTS.PROMPT.CLIENTUNKNOWNERRORTITLE', 'COMPONENTS.PROMPT.CLIENTUNKNOWNERRORINFO', 'COMPONENTS.PROMPT.CLIENTCLOSEDUNEXPECTEDBUTTONRECOVERY', 'COMPONENTS.PROMPT.CLIENTSTOPPEDBUTTONEXIT');
            this.enterRecoveryMode();
        } catch (ex) {
            // chose to stop wallet
            this.electron.remote.app.quit()
        }
    }

    async notifyClientUnknownError() {
        try {
            await this.prompt.alert('COMPONENTS.PROMPT.CLIENTCLOSEDUNEXPECTEDTITLE', 'COMPONENTS.PROMPT.CLIENTCLOSEDUNEXPECTEDINFO', 'COMPONENTS.PROMPT.CLIENTCLOSEDUNEXPECTEDBUTTONRECOVERY', 'COMPONENTS.PROMPT.CLIENTSTOPPEDBUTTONEXIT');
            this.enterRecoveryMode();
        } catch (ex) {
            // chose to stop wallet
            this.electron.remote.app.quit()
        }
    }

    async notifyBootstrapFailed() {
        try {
            await this.prompt.alert('COMPONENTS.PROMPT.BOOTSTRAPFAILEDTITLE', 'COMPONENTS.PROMPT.BOOTSTRAPFAILEDINFO', 'COMPONENTS.PROMPT.CLIENTCLOSEDUNEXPECTEDBUTTONRECOVERY', 'COMPONENTS.PROMPT.CLIENTSTOPPEDBUTTONEXIT');
            this.enterRecoveryMode();
        } catch (ex) {
            // chose to stop wallet
            this.electron.remote.app.quit()
        }
    }

    async notifyStartupFailed() {
        try {
            await this.prompt.alert('COMPONENTS.PROMPT.STARTUPFAILEDTITLE', 'COMPONENTS.PROMPT.STARTUPFAILEDINFO', 'COMPONENTS.PROMPT.CLIENTCLOSEDUNEXPECTEDBUTTONRECOVERY', 'COMPONENTS.PROMPT.CLIENTSTOPPEDBUTTONEXIT');
            this.enterRecoveryMode();
        } catch (ex) {
            // chose to stop wallet
            this.electron.remote.app.quit()
        }
    }

    private enterRecoveryMode() {
        this.recoveryMode = true;
        this.router.navigate(['/metrix/tools/3']);
    }

}

export enum RPCMethods {
    ADDRESSBOOKADD,
    ADDRESSBOOKLIST,
    ADDRESSBOOKREMOVE,
    BACKUPWALLET,
    CALLCONTRACT,
    CHANGEPASSPHRASE,
    CREATETRANSACTION,
    ENCRYPT,
    GETACCOUNTS,
    GETBLOCK,
    GETBLOCKCHAIN,
    GETBLOCKHASH,
    GETDGPINFO,
    TOHEXADDRESS,
    FROMHEXADDRESS,
    GETNETWORK,
    GETSTAKING,
    GETTRANSACTION,
    GETTRANSACTIONS,
    GETWALLET,
    LOCK,
    LOCKUNSPENT,
    NEWADDRESS,
    PEERS,
    SENDTOCONTRACT,
    SIGNMESSAGE,
    UNLOCK,
    UPDATELABEL,
    VERIFYMESSAGE
}
