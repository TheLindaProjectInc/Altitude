import { Component } from '@angular/core';
import { WalletService } from '../../providers/wallet.service';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

  txTimer;
  transactions = [];
  txSub;

  constructor(
    public wallet: WalletService,
  ) {
  }

  ngOnInit() {
    this.transactions = this.wallet.transactions.slice(0, 10);
    this.txSub = this.wallet.newBlockReceived.subscribe(() => {
      this.transactions = this.wallet.transactions.slice(0, 10);
    });
  }

  ngOnDestroy() {
    this.txSub.unsubscribe();
  }

  displayTransactions() {
    return this.transactions;
  }
}
