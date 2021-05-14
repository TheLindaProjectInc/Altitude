import { Component, Input } from '@angular/core';
import { ElectronService } from 'app/providers/electron.service';
import { ContextMenuService } from 'app/components/context-menu/context-menu.service';
import { CurrencyService } from 'app/providers/currency.service';
import Helpers from 'app/helpers';

@Component({
  selector: 'history-transaction-row',
  templateUrl: './transaction-row.component.html',
})
export class HistoryTransactionRowComponent {

  @Input() trx: any;

  public helpers = Helpers;
  constructor(
    private electron: ElectronService,
    private contextMenu: ContextMenuService,
    public currencyService: CurrencyService
  ) {

  }

  openLink(link) {
    this.electron.shell.openExternal(link);
  }

  // onRightClick(e, trx: {}) {
  //   const items = [
  //     {
  //       name: 'PAGES.TRANSACTIONS.COPYACCOUNT',
  //       func: () => this.electron.clipboard.writeText(trx.account)
  //     },
  //     {
  //       name: 'PAGES.TRANSACTIONS.COPYADDRESS',
  //       func: () => this.electron.clipboard.writeText(trx.address)
  //     },
  //     {
  //       name: 'PAGES.TRANSACTIONS.COPYAMOUNT',
  //       func: () => this.electron.clipboard.writeText(trx.amount.toString())
  //     },
  //     {
  //       name: 'PAGES.TRANSACTIONS.COPYBLOCKHASH',
  //       func: () => this.electron.clipboard.writeText(trx.blockHash)
  //     },
  //     {
  //       name: 'PAGES.TRANSACTIONS.COPTBLOCKINDEX',
  //       func: () => this.electron.clipboard.writeText(trx.blockIndex.toString())
  //     },
  //     {
  //       name: 'PAGES.TRANSACTIONS.COPYTXID',
  //       func: () => this.electron.clipboard.writeText(trx.txId)
  //     }
  //   ]
  //   this.contextMenu.show(e, items)
  // }

}
