import { Injectable, isDevMode } from '@angular/core';
import { Subscription, ReplaySubject } from 'rxjs';
import Big from 'big.js';
import { RpcService, RPCMethods } from 'app/metrix/providers/rpc.service';
import { Governor } from '../classes/governor';
import { U256 } from '../../../../node_modules/uint256/dist/UInt256';
import IDGPInfo from '../interfaces/IDGPInfo';
import Helpers from 'app/helpers';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { BudgetProposal } from '../classes/budgetProposal';
import { ElectronService } from 'app/providers/electron.service';
import { BudgetVote, ChainType } from 'app/enum';

@Injectable()
export class DGPService {

    onTransactionsUpdatedSub: Subscription;
    onAccountsUpdatedSub: Subscription;
    newBlockReceivedSub: Subscription;

    onDGPInfo = new ReplaySubject<void>()

    governor: Governor;
    dgpInfo: IDGPInfo;
    budgetProposals: Array<BudgetProposal> = [];
    governorList = {};
    governorListV1 = {};
    v1Governor: string;
    readonly defaultGasLimit = 500000;
    readonly defaultGasPrice = 0.00010000;
    readonly gasLimit_createProposal = 500000;

    constructor(
        private rpc: RpcService,
        private wallet: WalletService,
        private electron: ElectronService
    ) {
        this.loadData();
        this.newBlockReceivedSub = this.wallet.newBlockReceived.subscribe(() => {
            if (wallet.accounts.length) {
                if (this.onAccountsUpdatedSub) this.onAccountsUpdatedSub.unsubscribe();
                this.loadData();
            } else {
                this.onAccountsUpdatedSub = this.wallet.accountsUpdated.subscribe(() => {
                    this.loadData();
                })
            }
        });
    }

    public resetState() {
        this.governor = null;
        this.dgpInfo = null;
        this.budgetProposals = [];
        this.governorList = {};
        this.governorListV1 = {};
    }

    ngOnDestroy() {
        if (this.onAccountsUpdatedSub) this.onAccountsUpdatedSub.unsubscribe();
        if (this.newBlockReceivedSub) this.newBlockReceivedSub.unsubscribe();
    }

    public get minimumGovernors(): number {
        if (this.electron.chain === ChainType.MAINNET) return 100
        return 10;
    }

    public get voteMaturity(): number {
        if (this.electron.chain === ChainType.MAINNET) return 28 * 960
        return 40;
    }

    public get budgetSettlementPeriod(): number {
        if (this.electron.chain === ChainType.MAINNET) return 29220
        return 2000;
    }

    public get governorCount(): number {
        return Object.keys(this.governorList).length;
    }


    public get isMainChain(): boolean {
        if (this.electron.chain === ChainType.MAINNET) return true;
        return false;
    }

    private async loadData() {
        await this.getDGPInfo();
        await this.getGovernors();
        await this.getMyGovernor();
        await this.getGovernorsV1();
        await this.existsInV1();
        await this.loadBudgetProposals();
    }

    private async getGovernors() {
        let data: any = await this.rpc.requestData(RPCMethods.CALLCONTRACT, [this.dgpInfo.contracts.governance, GovernanceContract.GETADDRESSLIST]);
        if (!data.error && data.executionResult.excepted == 'None') {
            let chunks = data.executionResult.output.match(new RegExp('.{1,64}', 'g'));
            // add new governors
            let hexAddressList = [];
            for (let i = 2; i < chunks.length; i++) {
                let hexAddr = chunks[i].substring(24, 64);
                hexAddressList.push(hexAddr)
                if (!this.governorList[hexAddr]) {
                    let addr = await this.rpc.requestData(RPCMethods.FROMHEXADDRESS, [hexAddr]);
                    this.governorList[hexAddr] = addr
                }
            }
            // remove old governors
            Object.keys(this.governorList).forEach(hexAddr => {
                if (hexAddressList.indexOf(hexAddr) === -1) {
                    delete this.governorList[hexAddr]
                }
            })
        }
    }

// TODO
// This section is temporary and will be removed in future updates when the old v1 contract is empty of governors.
// ####

    private async getGovernorsV1() {
        let data: any = await this.rpc.requestData(RPCMethods.CALLCONTRACT, [GovernanceContract.ADDRESS, GovernanceContract.GETADDRESSLIST]);
        if (!data.error && data.executionResult.excepted == 'None') {
            let chunks = data.executionResult.output.match(new RegExp('.{1,64}', 'g'));
            // add new governors
            let hexAddressList = [];
            for (let i = 2; i < chunks.length; i++) {
                let hexAddr = chunks[i].substring(24, 64);
                hexAddressList.push(hexAddr)
                if (!this.governorListV1[hexAddr]) {
                    let addr = await this.rpc.requestData(RPCMethods.FROMHEXADDRESS, [hexAddr]);
                    this.governorListV1[hexAddr] = addr
                }
            }
            // remove old governors
            Object.keys(this.governorListV1).forEach(hexAddr => {
                if (hexAddressList.indexOf(hexAddr) === -1) {
                    delete this.governorListV1[hexAddr]
                }
            })
        }
    }

    private async existsInV1() {
        let addressList = this.wallet.addressList;
        let hexAddrs = Object.keys(this.governorListV1);
        for (let i = 0; i < hexAddrs.length; i++) {
            let govAddr = this.governorListV1[hexAddrs[i]];
            if (addressList.indexOf(govAddr) > -1) {
                this.v1Governor = govAddr;
            }
        }
    }

    public async unenrollV1Governor(passphrase: string) {
        try {
            await this.rpc.unlockWalletForCommand(passphrase);

            let gasPrice: Big = Helpers.fromSatoshi(Big(this.dgpInfo.mingasprice));
            let force: number = 0;
            let callData: string = GovernanceContract.UNENROLL +
                force.toString().padStart(64, '0');
            const args = [GovernanceContract.ADDRESS, callData, 0, this.defaultGasLimit, gasPrice.toFixed(8), this.v1Governor];
            let data: any = await this.rpc.requestData(RPCMethods.SENDTOCONTRACT, args);
            this.rpc.lockWalletAfterCommand(passphrase);
            if (!data.error) return data;
        } catch (ex) {
            this.rpc.lockWalletAfterCommand(passphrase);
            throw ex;
        }
    }

// ##############

    private async getDGPInfo() {
        let data: any = await this.rpc.requestData(RPCMethods.GETDGPINFO);
        if (!data.error) this.dgpInfo = data;
        this.onDGPInfo.next()
    }

    private async getMyGovernor() {
        let addressList = this.wallet.addressList;
        let hexAddrs = Object.keys(this.governorList);
        for (let i = 0; i < hexAddrs.length; i++) {
            let govAddr = this.governorList[hexAddrs[i]];
            if (addressList.indexOf(govAddr) > -1) {
                let callData: string = GovernanceContract.GOVERNORS.padEnd(32, '0') + hexAddrs[i];
                let data: any = await this.rpc.requestData(RPCMethods.CALLCONTRACT, [this.dgpInfo.contracts.governance, callData]);
                if (data.executionResult.output.replace(/0/g, '') !== '') {
                    if (!this.governor)
                        this.governor = new Governor(govAddr, data);
                    else
                        this.governor.update(data)
                }
                return;
            }
        }

        if (this.governor) this.governor = null;
    }

    public async enrollGovernor(passphrase: string, senderAddress: string) {
        try {
            await this.rpc.unlockWalletForCommand(passphrase);

            const args = [this.dgpInfo.contracts.governance, GovernanceContract.ENROLL, Helpers.fromSatoshi(this.dgpInfo.governancecollateral), this.defaultGasLimit, this.defaultGasPrice, senderAddress]
            let data: any = await this.rpc.requestData(RPCMethods.SENDTOCONTRACT, args);
            this.rpc.lockWalletAfterCommand(passphrase);
            if (!data.error) return data;
        } catch (ex) {
            this.rpc.lockWalletAfterCommand(passphrase);
            throw ex;
        }
    }

    public async unenrollGovernor(passphrase: string) {
        try {
            await this.rpc.unlockWalletForCommand(passphrase);

            let gasPrice: Big = Helpers.fromSatoshi(Big(this.dgpInfo.mingasprice));
            let force: number = 0;
            let callData: string = GovernanceContract.UNENROLL +
                force.toString().padStart(64, '0');
            const args = [this.dgpInfo.contracts.governance, callData, 0, this.defaultGasLimit, gasPrice.toFixed(8), this.governor.address];
            let data: any = await this.rpc.requestData(RPCMethods.SENDTOCONTRACT, args);
            this.rpc.lockWalletAfterCommand(passphrase);
            if (!data.error) return data;
        } catch (ex) {
            this.rpc.lockWalletAfterCommand(passphrase);
            throw ex;
        }
    }

    public async checkGovernanceEnrollmentStatus(txid: string): Promise<EnrollmentStatus> {
        try {
            const data = await this.rpc.requestData(RPCMethods.GETTRANSACTION, [txid]);
            if (!data.error && data.indexOf(this.dgpInfo.contracts.governance) > -1) {
                if (data.confirmations > 0) return EnrollmentStatus.CONFIRMED;
                return EnrollmentStatus.PENDING;
            }
        } catch (ex) {
        }
        return EnrollmentStatus.NONE;
    }

    private async getBudgetCount(): Promise<number> {
        let data: any = await this.rpc.requestData(RPCMethods.CALLCONTRACT, [this.dgpInfo.contracts.budget, BudgetContract.PROPOSALCOUNT]);
        if (!data.error) return Number(U256(data.executionResult.output, 16));
        return 0;
    }

    public async loadBudgetProposals() {
        try {
            for (let i = 0; i < 8; i++) {
                let callData: string = BudgetContract.GETPROPOSAL + i.toString(16).padStart(64, '0');
                let data: any = await this.rpc.requestData(RPCMethods.CALLCONTRACT, [this.dgpInfo.contracts.budget, callData]);
                if (!data.error && data.executionResult.excepted == 'None') {
                    if (data.executionResult.output.replace(/0/g, '') !== '') {
                        this.upsertBudget(new BudgetProposal(data), i);
                    }
                }
            }
            this.getMyBudgetVotes();
        } catch (ex) {
            if (isDevMode()) console.log(ex);
        }
    }

    private upsertBudget(newBudget: BudgetProposal, index: number) {
        let currBudget = this.budgetProposals[index];
        if (!currBudget) {
            this.budgetProposals.push(newBudget);
            return;
        }
        // update or overwrite
        if (currBudget.id === newBudget.id)
            currBudget.update(newBudget)
        else
            this.budgetProposals[index] = newBudget
    }

    private async getMyBudgetVotes() {
        if (this.governor) {
            this.budgetProposals.forEach(async budget => {
                if (!budget.removed) {
                    let callData: string = BudgetContract.VOTESTATUS + budget.id;
                    let data: any = await this.rpc.requestData(RPCMethods.CALLCONTRACT, [this.dgpInfo.contracts.budget, callData, this.governor.address]);
                    budget.setMyVote(data.executionResult.output)
                }
            })
        }
    }

    public async submitBudgetProposal(proposal: BudgetProposal, passphrase: string) {
        try {
            await this.rpc.unlockWalletForCommand(passphrase);

            let title = this.encodeContractString(proposal.title);
            let desc = this.encodeContractString(proposal.desc);
            let url = this.encodeContractString(proposal.url);

            let titleLocation = 160;
            let descLocation = titleLocation + 32 * title.length;
            let urlLocation = descLocation + 32 * desc.length;

            let callData: string = BudgetContract.CREATEPROPOSAL +
                titleLocation.toString(16).padStart(64, '0') +
                descLocation.toString(16).padStart(64, '0') +
                urlLocation.toString(16).padStart(64, '0') +
                Helpers.toSatoshi(proposal.requested).toString(16).padStart(64, '0') +
                proposal.duration.toString(16).padStart(64, '0') +
                title.join("") +
                desc.join("") +
                url.join("");

            let amountToSend = Helpers.fromSatoshi(this.dgpInfo.budgetfee);
            let gasPrice: Big = Helpers.fromSatoshi(Big(this.dgpInfo.mingasprice));

            let data: any = await this.rpc.requestData(RPCMethods.SENDTOCONTRACT, [this.dgpInfo.contracts.budget, callData, amountToSend, this.gasLimit_createProposal, gasPrice.toFixed(8), proposal.owner]);
            this.rpc.lockWalletAfterCommand(passphrase);
            if (!data.error) return data;
        } catch (ex) {
            this.rpc.lockWalletAfterCommand(passphrase);
            throw ex;
        }
    }

    public async submitBudgetVote(proposal: BudgetProposal, vote: BudgetVote, passphrase: string) {
        try {
            await this.rpc.unlockWalletForCommand(passphrase);

            let callData: string = BudgetContract.VOTEONPROPOSAL +
                proposal.id +
                vote.toString(16).padStart(64, '0');

            let gasPrice: Big = Helpers.fromSatoshi(Big(this.dgpInfo.mingasprice));

            let data: any = await this.rpc.requestData(RPCMethods.SENDTOCONTRACT, [this.dgpInfo.contracts.budget, callData, 0, this.defaultGasLimit, gasPrice.toFixed(8), this.governor.address]);
            this.rpc.lockWalletAfterCommand(passphrase);
            if (!data.error) return data;
        } catch (ex) {
            this.rpc.lockWalletAfterCommand(passphrase);
            throw ex;
        }
    }

    public async ping(passphrase: string) {
        try {
            await this.rpc.unlockWalletForCommand(passphrase);

            let gasPrice: Big = Helpers.fromSatoshi(Big(this.dgpInfo.mingasprice));

            let data: any = await this.rpc.requestData(RPCMethods.SENDTOCONTRACT, [this.dgpInfo.contracts.governance, GovernanceContract.PING, 0, this.defaultGasLimit, gasPrice.toFixed(8), this.governor.address]);
            this.rpc.lockWalletAfterCommand(passphrase);
            if (!data.error) return data;
        } catch (ex) {
            this.rpc.lockWalletAfterCommand(passphrase);
            throw ex;
        }
    }

    private encodeContractString(data: string): Array<string> {
        let result = [];

        let encoded = Buffer.from(data).toString('hex');
        let chunks = encoded.match(new RegExp('.{1,64}', 'g'));
        let length = data.length.toString(16);

        result.push(length.padStart(64, '0'));
        chunks.forEach(chunk => {
            result.push(chunk.padEnd(64, '0'));
        })

        return result;
    }
}

export enum EnrollmentStatus {
    CONFIRMED,
    PENDING,
    NONE
}

enum GovernanceContract {
    ADDRESS = "0000000000000000000000000000000000000089",
    CURRENTWINNER = "aabe2fe3",
    ENROLL = "e65f2a7e",
    GOVERNORCOUNT = "e8c9fd45",
    ISVALIDGOVERNOR = "73d606cf",
    PING = "5c36b186",
    UNENROLL = "fba71397",
    GOVERNORS = "e3eece26",
    GETADDRESSLIST = "883703c2"
}

enum BudgetContract {
    ADDRESS = "0000000000000000000000000000000000000090",
    PROPOSALCOUNT = "da35c664",
    GETPROPOSAL = "013cf08b",
    CREATEPROPOSAL = "2921bd8f",
    VOTEONPROPOSAL = "2d1cb8c8",
    BALANCE = "b69ef8a8",
    VOTESTATUS = "ef528e41"
}