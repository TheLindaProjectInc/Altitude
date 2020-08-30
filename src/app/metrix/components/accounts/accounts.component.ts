import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService, DATASYNCTYPES } from '../../providers/wallet.service';
import { NgxSmartModalService } from 'ngx-smart-modal';
import { ErrorService } from 'app/providers/error.service';
import { NotificationService } from 'app/providers/notification.service';
import { CurrencyService } from '../../../providers/currency.service';

@Component({
  selector: 'metrix-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss']
})

export class AccountsComponent {
  newAccountLabel = '';

  constructor(
    public wallet: WalletService,
    private router: Router,
    public ngxModal: NgxSmartModalService,
    private notification: NotificationService,
    private errorService: ErrorService,
    public currencyService: CurrencyService
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
