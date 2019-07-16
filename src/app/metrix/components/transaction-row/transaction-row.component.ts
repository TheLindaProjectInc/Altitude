import { Component, Input } from '@angular/core';
import { WalletService } from '../../providers/wallet.service';
import { ElectronService } from 'app/providers/electron.service';
import { Transaction } from '../../classes';
import { ContextMenuService } from 'app/components/context-menu/context-menu.service';
import Helpers from 'app/helpers';

@Component({
  selector: 'transaction-row',
  templateUrl: './transaction-row.component.html',
})
export class TransactionRowComponent {

  @Input() trx: Transaction;

  public helpers = Helpers;

  constructor(
    public wallet: WalletService,
    private electron: ElectronService,
    private contextMenu: ContextMenuService
  ) {

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
