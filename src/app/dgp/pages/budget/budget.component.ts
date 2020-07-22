import { Component, isDevMode } from '@angular/core';
import { ErrorService } from 'app/providers/error.service';
import { NotificationService } from 'app/providers/notification.service';
import Helpers from 'app/helpers';
import { DGPService } from 'app/dgp/providers/dgp.service';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { PromptService } from 'app/metrix/components/prompt/prompt.service';
import { RPCMethods } from 'app/metrix/providers/rpc.service';

@Component({
  templateUrl: './budget.component.html',
  styleUrls: ['./budget.component.scss']
})
export class BudgetComponent {

  constructor(
    private prompt: PromptService,
    private dgpService: DGPService,
    private errorService: ErrorService,
    private notification: NotificationService,
    private wallet: WalletService,
  ) {

  }

  public get proposals() {
    let budgets = [];
    this.dgpService.budgetProposals.slice().forEach((bdg) => {
      if (!bdg.removed) budgets.push(bdg);
    });
    return budgets;
  }

}
