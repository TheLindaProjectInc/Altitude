import { Component } from '@angular/core';
import { WalletService } from '../../providers/wallet.service';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

  constructor(
    public wallet: WalletService,
  ) {
  }

  displayTransactions() {
    return this.wallet.transactions.slice(0, 10);
  }
}
