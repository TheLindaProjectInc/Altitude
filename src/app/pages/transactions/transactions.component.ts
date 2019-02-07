import { Component } from '@angular/core';
import { WalletService } from '../../providers/wallet.service';
import Helpers from '../../helpers';
import { ChangeEvent } from 'ngx-virtual-scroller';
import { ErrorService } from '../../providers/error.service';
import { ContextMenuService } from '../../components/context-menu/context-menu.service';
import { ElectronService } from '../../providers/electron.service';
import { Transaction } from '../../classes';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
})

export class TransactionsComponent {
  sub;

  public helpers = Helpers;
  transactions = [];
  skip = 10;
  loading = false;

  constructor(
    public wallet: WalletService,
    private errorService: ErrorService,
    private contextMenu: ContextMenuService,
    private electron: ElectronService
  ) {
  }

  ngOnInit(): void {
    this.transactions = this.wallet.transactions;
    this.sub = this.wallet.transactionsUpdated.subscribe(() => {
      this.transactions = this.wallet.transactions;
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.wallet.cleanupTransactions();
  }

  async fetchMore(event: ChangeEvent) {
    if (this.loading || event.end !== this.wallet.transactions.length - 1) return;
    this.loading = true;
    try {
      await this.wallet.getTransactions(10, this.skip);
      this.transactions = this.wallet.transactions;
      this.skip += 10;
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
    this.loading = false;
  }

  onRightClick(e, trx: Transaction) {
    const items = [
      {
        name: 'PAGES.TRANSACTIONS.COPYACCOUNT',
        func: () => this.electron.clipboard.writeText(trx.account)
      },
      {
        name: 'PAGES.TRANSACTIONS.COPYADDRESS',
        func: () => this.electron.clipboard.writeText(trx.address)
      },
      {
        name: 'PAGES.TRANSACTIONS.COPYAMOUNT',
        func: () => this.electron.clipboard.writeText(trx.amount.toString())
      },
      {
        name: 'PAGES.TRANSACTIONS.COPYBLOCKHASH',
        func: () => this.electron.clipboard.writeText(trx.blockHash)
      },
      {
        name: 'PAGES.TRANSACTIONS.COPTBLOCKINDEX',
        func: () => this.electron.clipboard.writeText(trx.blockIndex.toString())
      },
      {
        name: 'PAGES.TRANSACTIONS.COPYTXID',
        func: () => this.electron.clipboard.writeText(trx.txId)
      }
    ]
    this.contextMenu.show(e, items)
  }


}
