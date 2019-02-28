import { Component } from '@angular/core';
import { WalletService, DATASYNCTYPES } from '../../providers/wallet.service';
import helpers from '../../helpers';
import { Router } from '@angular/router';
import { NgxSmartModalService } from 'ngx-smart-modal';
import { ErrorService } from '../../providers/error.service';
import { NotificationService } from '../../providers/notification.service';

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

}
