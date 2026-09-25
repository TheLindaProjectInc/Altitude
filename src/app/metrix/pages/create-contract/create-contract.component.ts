import { Component, OnInit, OnDestroy, isDevMode } from '@angular/core';
import { Subscription } from 'rxjs';
import Big from 'big.js';
import { RpcService, RPCMethods } from 'app/metrix/providers/rpc.service';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { Account } from 'app/metrix/classes/account';
import { PromptService } from 'app/components/prompt/prompt.service';
import { NotificationService } from 'app/providers/notification.service';
import { ErrorService } from 'app/providers/error.service';
import { ElectronService } from 'app/providers/electron.service';
import Helpers from 'app/helpers';
import ICreateContractResult from 'app/metrix/interfaces/ICreateContractResult';

// Gas defaults/bounds below are taken directly from the reference Qt wallet's own
// contract-creation dialog and node source, not guessed or copied from metrilib's
// generic JS-client defaults (which turn out to differ - metrilib's own default gas
// limit is 2,500,000, considerably lower than the reference wallet's 20,000,000):
//   MINIMUM_GAS_LIMIT / DEFAULT_GAS_LIMIT_OP_CREATE / DEFAULT_GAS_PRICE
//     -> src/validation.h
//   DEFAULT_BLOCK_GAS_LIMIT_DGP (fallback max, until live DGP info arrives)
//     -> src/qtum/qtumDGP.h
//   HIGH_GASPRICE warning threshold, SINGLE_STEP
//     -> src/qt/createcontract.cpp (CreateContract_NS)
// https://github.com/TheLindaProjectInc/Metrix/blob/master/src/qt/createcontract.cpp
//
// createcontract's result shape ({txid, sender, hash160, address}) is confirmed against
// ContractResult::updateCreateResult in src/qt/contractresult.cpp. gettransactionreceipt's
// result shape (blockHash/transactionHash/from/to/cumulativeGasUsed/gasUsed/
// contractAddress/excepted/exceptedMessage/...) is confirmed against assignJSON() in
// src/rpc/blockchain.cpp - a receipt only ever exists once the tx has been mined
// (Qtum-family chains derive it from block execution), so a non-empty response IS
// confirmation; "excepted" stringifies to "None" on success, any other value is a
// reverted/failed constructor execution despite the transaction itself being mined.

@Component({
    templateUrl: './create-contract.component.html',
    styleUrls: ['./create-contract.component.scss'],
    standalone: false
})
export class CreateContractComponent implements OnInit, OnDestroy {

    readonly minGasLimitFloor = 10000;
    readonly defaultGasLimit = 20000000;
    readonly defaultBlockGasLimit = 40000000;
    readonly defaultGasPrice = Big('0.00005000');
    readonly gasPriceStep = '0.00000001';
    readonly highGasPriceThreshold = Big('0.00100000');

    bytecode = '';
    fromAddress = '';
    addresslist: Account[] = [];

    gasLimit = this.defaultGasLimit;
    gasPrice = this.defaultGasPrice.toFixed(8);
    minGasLimit = this.minGasLimitFloor;
    maxGasLimit = this.defaultBlockGasLimit;
    minGasPrice = this.defaultGasPrice.toFixed(8);

    deploying = false;
    result: ICreateContractResult = null;
    receipt: any = null;
    private receiptChecking = false;

    private newBlockReceivedSub: Subscription;

    constructor(
        private rpc: RpcService,
        public wallet: WalletService,
        private prompt: PromptService,
        private notification: NotificationService,
        private errorService: ErrorService,
        public electron: ElectronService,
    ) { }

    async ngOnInit() {
        this.showAddresses();
        this.newBlockReceivedSub = this.wallet.newBlockReceived.subscribe(() => {
            this.showAddresses();
            if (this.result && !this.receipt) this.checkReceipt();
        });

        try {
            const dgpInfo: any = await this.rpc.requestData(RPCMethods.GETDGPINFO);
            if (dgpInfo && dgpInfo.blockgaslimit) {
                this.maxGasLimit = dgpInfo.blockgaslimit;
                // the 20,000,000 default can exceed a chain whose live block gas limit is
                // lower (e.g. a regtest/testnet DGP configured smaller than mainnet's) -
                // clamp down rather than silently leaving the form in an invalid state
                if (this.gasLimit > this.maxGasLimit) this.gasLimit = this.maxGasLimit;
            }
            if (dgpInfo && dgpInfo.mingasprice !== undefined) {
                const liveMinGasPrice = Helpers.fromSatoshi(Big(dgpInfo.mingasprice)) as Big;
                this.minGasPrice = liveMinGasPrice.toFixed(8);
                this.gasPrice = (liveMinGasPrice.gt(this.defaultGasPrice) ? liveMinGasPrice : this.defaultGasPrice).toFixed(8);
            }
        } catch (ex) {
            // fall back to the reference-wallet defaults already set above
        }
    }

    ngOnDestroy() {
        if (this.newBlockReceivedSub) this.newBlockReceivedSub.unsubscribe();
    }

    showAddresses() {
        this.addresslist = this.wallet.getAccounts(true);
        if (!this.fromAddress && this.addresslist.length) this.fromAddress = this.addresslist[0].address;
    }

    get isValidBytecode(): boolean {
        const clean = (this.bytecode || '').trim();
        return clean.length > 0 && clean.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(clean);
    }

    get estimatedMaxCost(): string {
        try {
            return Big(this.gasPrice || 0).mul(this.gasLimit || 0).toFixed(8);
        } catch (ex) {
            return '0.00000000';
        }
    }

    checkFormValid(): boolean {
        if (!this.fromAddress) return false;
        if (!this.isValidBytecode) return false;
        if (!this.gasLimit || this.gasLimit < this.minGasLimit || this.gasLimit > this.maxGasLimit) return false;
        try {
            if (!this.gasPrice || Big(this.gasPrice).lt(this.minGasPrice)) return false;
        } catch (ex) {
            return false;
        }
        return true;
    }

    async deploy() {
        if (this.deploying) return;
        if (!this.checkFormValid()) {
            this.notification.notify('error', 'PAGES.CREATECONTRACT.INCOMPLETEFORM');
            return;
        }

        if (Big(this.gasPrice).gt(this.highGasPriceThreshold)) {
            try {
                await this.prompt.alert(
                    'PAGES.CREATECONTRACT.HIGHGASPRICETITLE',
                    'PAGES.CREATECONTRACT.HIGHGASPRICEINFO',
                    'MISC.ACCEPTBUTTON',
                    'MISC.CANCELBUTTON',
                    `${this.estimatedMaxCost} MRX`,
                );
            } catch (ex) {
                return; // user chose not to continue
            }
        }

        let passphrase;
        try {
            if (this.wallet.requireUnlock()) [passphrase] = await this.prompt.getPassphrase();
        } catch (ex) {
            // passphrase prompt closed
            return;
        }

        this.deploying = true;
        this.notification.loading('PAGES.CREATECONTRACT.DEPLOYING');
        try {
            await this.rpc.unlockWalletForCommand(passphrase);
            const data: any = await this.rpc.requestData(RPCMethods.CREATECONTRACT, [this.bytecode.trim(), this.gasLimit, this.gasPrice, this.fromAddress]);
            this.rpc.lockWalletAfterCommand(passphrase);
            if (!data || data.error) throw data;
            this.result = data;
            this.receipt = null;
            this.notification.notify('success', 'PAGES.CREATECONTRACT.DEPLOYED');
            this.checkReceipt();
        } catch (ex) {
            this.rpc.lockWalletAfterCommand(passphrase);
            if (isDevMode()) console.log(ex);
            this.errorService.diagnose(ex);
        }
        this.deploying = false;
    }

    // gettransactionreceipt only ever returns a receipt once the transaction has been
    // mined (Qtum-family chains derive the receipt from block execution), so a
    // successful, non-empty response here IS confirmation - no separate confirmations
    // check needed. A failure/empty response just means it's still pending; swallow and
    // let the next new-block tick retry.
    async checkReceipt() {
        if (!this.result || this.receiptChecking) return;
        this.receiptChecking = true;
        try {
            const data: any = await this.rpc.requestData(RPCMethods.GETTRANSACTIONRECEIPT, [this.result.txid]);
            const receipt = Array.isArray(data) ? data[0] : data;
            if (receipt && (receipt.blockHash || receipt.transactionHash)) this.receipt = receipt;
        } catch (ex) {
            // not confirmed yet
        }
        this.receiptChecking = false;
    }

    get deploymentSucceeded(): boolean {
        return !!this.receipt && (!this.receipt.excepted || this.receipt.excepted === 'None');
    }

    get deploymentFailed(): boolean {
        return !!this.receipt && !!this.receipt.excepted && this.receipt.excepted !== 'None';
    }

    copy(text: string) {
        if (!text) return;
        this.electron.clipboard.writeText(text);
        this.notification.notify('success', 'NOTIFICATIONS.COPIEDCLIPBOARD');
    }

    viewTxOnExplorer() {
        if (!this.result) return;
        this.electron.shell.openExternal(`${this.electron.blockExplorerUrl()}/tx/${this.result.txid}`);
    }

    reset() {
        this.bytecode = '';
        this.result = null;
        this.receipt = null;
    }
}
