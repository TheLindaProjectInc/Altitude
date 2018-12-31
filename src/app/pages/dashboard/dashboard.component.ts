import { Component } from '@angular/core';
import { WalletService, DATASYNCTYPES } from '../../providers/wallet.service';
import helpers from '../../helpers';
import { Router } from '@angular/router';
import { NgxSmartModalService } from 'ngx-smart-modal';
import { ErrorService } from '../../providers/error.service';
import { NotificationService } from '../../providers/notification.service';
import { ElectronService } from '../../providers/electron.service';
import { ContextMenuService } from '../../components/context-menu/context-menu.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  public helpers = helpers;
  newAccountLabel = '';
  hideEmptyAccounts = true;

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
    let trx = [];
    for (let i = 0; i <= 10; i++) {
      if (this.wallet.transactions[i])
        trx.push(this.wallet.transactions[i]);
    }
    return trx;
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
