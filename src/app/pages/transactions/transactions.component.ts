import { Component } from '@angular/core';
import { WalletService } from '../../providers/wallet.service';
import Helpers from '../../helpers';
import { ChangeEvent } from 'ngx-virtual-scroller';
import { ErrorService } from '../../providers/error.service';
import { ContextMenuService } from '../../components/context-menu/context-menu.service';
import { ElectronService } from '../../providers/electron.service';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
})

export class TransactionsComponent {
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

  ngOnDestroy() {
    if (this.wallet.transactions.length > 10) {
      const toRemove = this.wallet.transactions.length - 10;
      this.wallet.transactions.splice(10, toRemove);
    }
  }

  async fetchMore(event: ChangeEvent) {
    if (this.loading || event.end !== this.wallet.transactions.length - 1) return;
    this.loading = true;
    try {
      await this.wallet.getTransactions(10, this.skip);
      this.skip += 10;
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
    this.loading = false;
  }

  onRightClick(e, trx) {
    const items = [
      {
        name: 'PAGES.TRANSACTIONS.COPYBLOCKHASH',
        func: () => this.electron.clipboard.writeText(trx.blockHash)
      },
      {
        name: 'PAGES.TRANSACTIONS.COPYTXID',
        func: () => this.electron.clipboard.writeText(trx.txId)
      }
    ]
    this.contextMenu.show(e, items)
  }


}
