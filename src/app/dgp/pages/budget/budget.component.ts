import { Component } from '@angular/core';
import { DGPService } from 'app/dgp/providers/dgp.service';
import { WalletService } from 'app/metrix/providers/wallet.service';

@Component({
  templateUrl: './budget.component.html',
  styleUrls: ['./budget.component.scss']
})
export class BudgetComponent {

  constructor(
    private wallet: WalletService,
    public dgpService: DGPService,
  ) {
  }

  public get budgetBlock(): number {
    if (!this.wallet.blockchainStatus) return 0;
    let nextBudgetBlock = Math.ceil(this.wallet.blockchainStatus.latestBlockHeight / this.dgpService.budgetSettlementPeriod) * this.dgpService.budgetSettlementPeriod;
    return nextBudgetBlock;
  }

  public get proposals() {
    let budgets = [];
    this.dgpService.budgetProposals.slice().forEach((bdg) => {
      if (!bdg.removed) budgets.push(bdg);
    });
    return budgets;
  }



}
