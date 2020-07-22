import { Component, Input, Output, EventEmitter, isDevMode } from '@angular/core';
import Helpers from 'app/helpers';
import { BudgetProposal } from 'app/dgp/classes/budgetProposal';
import { ElectronService } from 'app/providers/electron.service';
import { DGPService } from 'app/dgp/providers/dgp.service';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { PromptService } from 'app/metrix/components/prompt/prompt.service';
import { NotificationService } from 'app/providers/notification.service';
import { ErrorService } from 'app/providers/error.service';
import { BudgetVote } from 'app/enum';

@Component({
  selector: 'budget-card',
  templateUrl: './budget-card.component.html',
  styleUrls: ['./budget-card.component.scss']
})
export class BudgetCardComponent {

  @Input() proposal: BudgetProposal;
  @Output() start = new EventEmitter();

  public helpers = Helpers;

  constructor(
    private electron: ElectronService,
    private dgpService: DGPService,
    private wallet: WalletService,
    private prompt: PromptService,
    private notification: NotificationService,
    private errorService: ErrorService
  ) {
    // todo check if can vote
  }

  openUrl() {
    this.electron.shell.openExternal(this.proposal.url);
  }

  get requested() {
    return this.helpers.prettyCoins(this.helpers.fromSatoshi(this.proposal.requested));
  }

  get remaining() {
    return this.proposal.duration - this.proposal.durationsPaid;
  }

  get requiredVote(): number {
    if (this.dgpService.governorCount < this.dgpService.minimumGovernors)
      return this.dgpService.minimumGovernors
    return Math.floor(this.dgpService.governorCount / 10);
  }

  get isPassing() {
    return (this.proposal.yesVote - this.proposal.noVote) > this.requiredVote
  }

  get votesToPass() {
    let remaining = this.requiredVote + 1 - (this.proposal.yesVote - this.proposal.noVote)
    let votes = Math.round(Math.abs(remaining));
    if (this.isPassing) return votes + 1;
    return votes
  }

  get passPercent() {
    let votes = this.proposal.yesVote - this.proposal.noVote;
    if (votes < 0) return 0
    return Math.floor(votes / (this.requiredVote + 1) * 100);
  }

  public async vote(vote: BudgetVote): Promise<void> {
    let passphrase;
    try {
      if (this.wallet.requireUnlock()) [passphrase,] = await this.prompt.getPassphrase();
    } catch (ex) {
      // passphrase prompt closed
      return;
    }

    this.notification.loading('DGP.NOTIFICATIONS.VOTINGONPROPOSAL');

    try {
      await this.dgpService.submitBudgetVote(this.proposal, vote, passphrase);
      this.notification.notify('success', 'DGP.NOTIFICATIONS.VOTEDONPROPOSAL');
    } catch (ex) {
      if (isDevMode()) console.log(ex);
      this.errorService.diagnose(ex);
    }
  }

}
