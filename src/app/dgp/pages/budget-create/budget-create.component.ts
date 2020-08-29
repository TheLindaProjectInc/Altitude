import { Component, isDevMode } from '@angular/core';
import { ErrorService } from 'app/providers/error.service';
import { NotificationService } from 'app/providers/notification.service';
import Helpers from 'app/helpers';
import { DGPService } from 'app/dgp/providers/dgp.service';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { PromptService } from 'app/components/prompt/prompt.service';
import { BudgetProposal } from 'app/dgp/classes/budgetProposal';
import { AddressBookService } from 'app/metrix/components/address-book/address-book.service';

@Component({
  templateUrl: './budget-create.component.html',
  styleUrls: ['./budget-create.component.scss']
})
export class BudgetCreateComponent {

  public proposal = new BudgetProposal();
  private isSubmitting: boolean = false;

  constructor(
    private prompt: PromptService,
    private dgpService: DGPService,
    private errorService: ErrorService,
    private notification: NotificationService,
    private wallet: WalletService,
    private addressBook: AddressBookService
  ) {
  }

  public get budgetFee(): number {
    if (!this.dgpService.dgpInfo) return 0;
    return Helpers.fromSatoshi(this.dgpService.dgpInfo.budgetfee);
  }

  public get budgetBlock(): number {
    if (!this.wallet.blockchainStatus) return 0;
    let nextBudgetBlock = Math.ceil(this.wallet.blockchainStatus.latestBlockHeight / this.dgpService.budgetSettlementPeriod) * this.dgpService.budgetSettlementPeriod;
    return nextBudgetBlock;
  }

  public async getFromAddressBook(): Promise<void> {
    const addr = await this.addressBook.getAddress(false);
    if (addr) this.proposal.owner = addr.address;
  }

  public async createProposal(): Promise<void> {
    if (this.isSubmitting) return;
    if (!this.checkFormValid()) return;

    let passphrase;
    try {
      if (this.wallet.requireUnlock()) [passphrase,] = await this.prompt.getPassphrase();
    } catch (ex) {
      // passphrase prompt closed
      return;
    }

    this.notification.loading('DGP.NOTIFICATIONS.CREATINGPROPOSAL');
    this.isSubmitting = true;

    try {
      await this.dgpService.submitBudgetProposal(this.proposal, passphrase);
      this.proposal = new BudgetProposal();
      this.notification.notify('success', 'DGP.NOTIFICATIONS.CREATEDPROPOSAL');
    } catch (ex) {
      if (isDevMode()) console.log(ex);
      this.errorService.diagnose(ex);
    }
    this.isSubmitting = false;
  }

  private checkFormValid(): boolean {
    if (!this.proposal.owner ||
      !this.proposal.title ||
      !this.proposal.desc ||
      !this.proposal.url ||
      !this.proposal.requested ||
      !this.proposal.duration) {
      this.notification.notify('error', 'DGP.NOTIFICATIONS.INCOMPLETEFORM');
      return false;
    }
    if (this.proposal.duration < 1 || this.proposal.duration > 12) {
      this.notification.notify('error', 'DGP.NOTIFICATIONS.INVALIDPROPOSALDURATION');
      return false;
    }

    // todo validate url

    return true;
  }
}
