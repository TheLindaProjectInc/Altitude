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
    } else if(this.wallet.blockchainStatus.latestBlockHeight >= 766080 /*&& this.wallet.blockchainStatus.latestBlockHeight < "TODO - REPLACE THIS WITH DGPV3 Activation"*/){
      let delta = 6360; //this is the block skew between the DGPv1 and v2 settlement blocks.
      nextBudgetBlock = (Math.ceil(this.wallet.blockchainStatus.latestBlockHeight / this.dgpService.budgetSettlementPeriod) * this.dgpService.budgetSettlementPeriod) + delta;
    } else {
      // TODO Update the delta when we know what v3 is going to be.
      let delta = 6360; //this is the block skew between the DGPv1 and v3 settlement blocks.
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
