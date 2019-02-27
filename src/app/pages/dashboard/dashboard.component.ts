import { Component } from '@angular/core';
import { WalletService, DATASYNCTYPES } from '../../providers/wallet.service';
import helpers from '../../helpers';
import { Router } from '@angular/router';
import { NgxSmartModalService } from 'ngx-smart-modal';
import { ErrorService } from '../../providers/error.service';
import { NotificationService } from '../../providers/notification.service';
import { ElectronService } from '../../providers/electron.service';
import { ContextMenuService } from '../../components/context-menu/context-menu.service';
import { Transaction } from '../../classes';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  public helpers = helpers;
  newAccountLabel = '';

  constructor(
    public wallet: WalletService,
    private router: Router,
    public ngxModal: NgxSmartModalService,
    private notification: NotificationService,
    private errorService: ErrorService,
    private electron: ElectronService,
    private contextMenu: ContextMenuService
  ) {
  }

  displayTransactions() {
    return this.wallet.transactions.slice(0, 10);
  }

  manageAccount(account) {
    this.router.navigate(['/manage-account', account.address]);
  }

  showNewAccountModal() {
    this.newAccountLabel = '';
    this.ngxModal.getModal('addAccountModal').open()
  }

  async createNewAccount() {
    this.ngxModal.getModal('addAccountModal').close();
    try {
      await this.wallet.getNewAddress(this.newAccountLabel);
      await this.wallet.requestDataSync(DATASYNCTYPES.ACCOUNTS);
      this.notification.notify('success', 'NOTIFICATIONS.CREATEDNEWACCOUNT');
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
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
