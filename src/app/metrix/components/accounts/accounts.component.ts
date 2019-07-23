import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService, DATASYNCTYPES } from '../../providers/wallet.service';
import Helpers from 'app/helpers';
import { NgxSmartModalService } from 'ngx-smart-modal';
import { ErrorService } from 'app/providers/error.service';
import { NotificationService } from 'app/providers/notification.service';

@Component({
  selector: 'metrix-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss']
})

export class AccountsComponent {
  newAccountLabel = '';
  public helpers = Helpers;

  constructor(
    public wallet: WalletService,
    private router: Router,
    public ngxModal: NgxSmartModalService,
    private notification: NotificationService,
    private errorService: ErrorService,
  ) {

  }

  manageAccount(account) {
    this.router.navigate(['/metrix/manage-account', account.address]);
  }

  showNewAccountModal() {
    this.newAccountLabel = '';
    this.ngxModal.getModal('addAccountModal').open();
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
