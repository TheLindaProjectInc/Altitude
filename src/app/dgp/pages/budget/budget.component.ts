import { Component } from '@angular/core';
import { DGPService } from 'app/dgp/providers/dgp.service';

@Component({
  templateUrl: './budget.component.html',
  styleUrls: ['./budget.component.scss']
})
export class BudgetComponent {

  constructor(
    public dgpService: DGPService,
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
