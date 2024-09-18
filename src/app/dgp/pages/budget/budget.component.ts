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
    let nextBudgetBlock;
    if(this.wallet.blockchainStatus.latestBlockHeight < 766080) {
      nextBudgetBlock = Math.ceil(this.wallet.blockchainStatus.latestBlockHeight / this.dgpService.budgetSettlementPeriod) * this.dgpService.budgetSettlementPeriod;
    } else if(this.wallet.blockchainStatus.latestBlockHeight >= 766080 && this.wallet.blockchainStatus.latestBlockHeight < 1008000){
      let delta = 6360; //this is the block skew between the DGPv1 and v2 settlement blocks.
      nextBudgetBlock = (Math.ceil(this.wallet.blockchainStatus.latestBlockHeight / this.dgpService.budgetSettlementPeriod) * this.dgpService.budgetSettlementPeriod) + delta;
    } else {
      let delta = 14520; //this is the block skew between the DGPv1 and v3 settlement blocks.
      nextBudgetBlock = (Math.ceil(this.wallet.blockchainStatus.latestBlockHeight / this.dgpService.budgetSettlementPeriod) * this.dgpService.budgetSettlementPeriod) + delta;
    }
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
