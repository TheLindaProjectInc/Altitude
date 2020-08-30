import { Component } from '@angular/core';
import { WalletService } from '../../providers/wallet.service';
import { IPageInfo } from 'ngx-virtual-scroller';
import { ErrorService } from 'app/providers/error.service';
import { ElectronService } from 'app/providers/electron.service';
import { Transaction } from '../../classes';
import { NotificationService } from 'app/providers/notification.service';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
})

export class TransactionsComponent {
  transactionsUpdatedSub;
  newBlockSub;

  transactions = [];
  skip = 10;
  loading = false;
  hasMoreTransaction = true;

  constructor(
    public wallet: WalletService,
    private errorService: ErrorService,
    private electron: ElectronService,
    private notification: NotificationService
  ) {
  }

  ngOnInit(): void {
    this.transactions = this.wallet.transactions;
    this.transactionsUpdatedSub = this.wallet.transactionsUpdated.subscribe(() => {
      this.transactions = this.wallet.transactions;
    });
    this.newBlockSub = this.wallet.newBlockReceived.subscribe(() => {
      this.hasMoreTransaction = true
    })
  }

  ngOnDestroy() {
    this.transactionsUpdatedSub.unsubscribe();
    this.newBlockSub.unsubscribe();
    this.wallet.cleanupTransactions();
  }

  async fetchMore(event: IPageInfo) {
    const transactionCount = this.wallet.transactions.length;
    if (this.loading || event.endIndex !== transactionCount - 1 || !this.hasMoreTransaction) return;
    this.loading = true;
    try {
      await this.wallet.getTransactions(10, this.skip);
      this.transactions = this.wallet.transactions;
      if (transactionCount === this.transactions.length) {
        this.hasMoreTransaction = false
      }
      this.skip += 10;
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
    this.loading = false;
  }

  copyTransactions() {
    let txt = 'Account\tAddress\tAmount\tFee\tCategory\tSub Category\tConfirmations\tTime\tTransaction Hash\tBlock Hash\n';
    this.transactions.forEach((trx: Transaction) => {
      txt += `${trx.account}\t${trx.address}\t${trx.amount}\t${trx.fee ? trx.fee : 0}\t${trx.category}\t${trx.subCategory}\t${trx.confirmations}\t${trx.blockTime}\t${trx.txId}\t${trx.blockHash}\n`;
    })
    this.electron.clipboard.writeText(txt)
    this.notification.notify('success', 'NOTIFICATIONS.TRANSACTIONSCOPIEDCLIPBOARD');
  }


}
