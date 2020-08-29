import { Injectable, isDevMode } from '@angular/core';
import { Subscription } from 'rxjs';
import Big from 'big.js';
import { RpcService, RPCMethods } from 'app/metrix/providers/rpc.service';
import { Governor } from '../classes/governor';
import { U256 } from 'uint256';
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

    governor: Governor;
    dgpInfo: IDGPInfo;
    budgetProposals: Array<BudgetProposal> = [];
    governorList = {};
    readonly defaultGasLimit = 250000;
    readonly gasLimit_createProposal = 500000;

    constructor(
        private rpc: RpcService,
        private wallet: WalletService,
        private electron: ElectronService
    ) {
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

    ngOnDestroy() {
        if (this.onAccountsUpdatedSub) this.onAccountsUpdatedSub.unsubscribe();
        if (this.newBlockReceivedSub) this.newBlockReceivedSub.unsubscribe();
    }

    public get minimumGovernors(): number {
        if (this.electron.chain === ChainType.MAINNET) return 100
        return 10;
    }

    public get budgetSettlementPeriod(): number {
        if (this.electron.chain === ChainType.MAINNET) return 29220
        return 2000;
    }

    public get governorCount(): number {
        return Object.keys(this.governorList).length;
    }

    private async loadData() {
        await this.getDGPInfo();
        await this.getGovernors();
        await this.getMyGovernor();
        await this.loadBudgetProposals();
    }

    private async getGovernors() {
        let data: any = await this.rpc.requestData(RPCMethods.CALLCONTRACT, [GovernanceContract.ADDRESS, GovernanceContract.GETADDRESSLIST]);
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

    private async getDGPInfo() {
        let data: any = await this.rpc.requestData(RPCMethods.GETDGPINFO);
        if (!data.error) this.dgpInfo = data;
    }

    private async getMyGovernor() {
        let addressList = this.wallet.addressList;
        let hexAddrs = Object.keys(this.governorList);
        for (let i = 0; i < hexAddrs.length; i++) {
            let govAddr = this.governorList[hexAddrs[i]];
            if (addressList.indexOf(govAddr) > -1) {
                if (!this.governor) {
                    let callData: string = GovernanceContract.GOVERNORS.padEnd(32, '0') + hexAddrs[i];
                    let data: any = await this.rpc.requestData(RPCMethods.CALLCONTRACT, [GovernanceContract.ADDRESS, callData]);
                    if (data.executionResult.output.replace(/0/g, '') !== '')
                        this.governor = new Governor(addressList[i], data);
                }
                return;
            }
        }

        if (this.governor) this.governor = null;
    }

    public async enrollGovernor(passphrase: string) {
        try {
            await this.rpc.unlockWalletForCommand(passphrase);
            let data: any = await this.rpc.requestData(RPCMethods.SENDTOCONTRACT, [GovernanceContract.ADDRESS, GovernanceContract.ENROLL, Helpers.fromSatoshi(this.dgpInfo.governancecollateral)]);
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

            const args = [GovernanceContract.ADDRESS, GovernanceContract.UNENROLL, 0, this.defaultGasLimit, gasPrice.toFixed(8), this.governor.address]
            let data: any = await this.rpc.requestData(RPCMethods.SENDTOCONTRACT, args);
            this.rpc.lockWalletAfterCommand(passphrase);
            if (!data.error) return data;
        } catch (ex) {
            this.rpc.lockWalletAfterCommand(passphrase);
            throw ex;
        }
    }

    public async checkGovernanceEnrollmentStatus(txid: string): Promise<number> {
        try {
            const data = await this.rpc.requestData(RPCMethods.GETTRANSACTION, [txid]);
            if (!data.error) {
                if (data.hex && data.hex.indexOf(GovernanceContract.ADDRESS) > -1) {
                    if (data.confirmations > 0) return 1;
                    return 0;
                }
            }
        } catch (ex) {
        }
        return -1;
    }

    private async getBudgetCount(): Promise<number> {
        let data: any = await this.rpc.requestData(RPCMethods.CALLCONTRACT, [BudgetContract.ADDRESS, BudgetContract.PROPOSALCOUNT]);
        if (!data.error) return Number(U256(data.executionResult.output, 16));
        return 0;
    }

    public async loadBudgetProposals() {
        try {
            for (let i = 0; i < 8; i++) {
                let callData: string = BudgetContract.GETPROPOSAL + i.toString(16).padStart(64, '0');
                let data: any = await this.rpc.requestData(RPCMethods.CALLCONTRACT, [BudgetContract.ADDRESS, callData]);
                if (data.executionResult.output.replace(/0/g, '') !== '') {
                    this.upsertBudget(new BudgetProposal(data), i);
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
                    let data: any = await this.rpc.requestData(RPCMethods.CALLCONTRACT, [BudgetContract.ADDRESS, callData, this.governor.address]);
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

            let data: any = await this.rpc.requestData(RPCMethods.SENDTOCONTRACT, [BudgetContract.ADDRESS, callData, amountToSend, this.gasLimit_createProposal, gasPrice.toFixed(8), proposal.owner]);
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

            let data: any = await this.rpc.requestData(RPCMethods.SENDTOCONTRACT, [BudgetContract.ADDRESS, callData, 0, this.defaultGasLimit, gasPrice.toFixed(8), this.governor.address]);
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

            let data: any = await this.rpc.requestData(RPCMethods.SENDTOCONTRACT, [GovernanceContract.ADDRESS, GovernanceContract.PING, 0, this.defaultGasLimit, gasPrice.toFixed(8), this.governor.address]);
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