import { Component } from '@angular/core';
import { WalletService } from '../../providers/wallet.service';
import { ActivatedRoute, Router } from '@angular/router';
import helpers from '../../helpers';
import { ElectronService } from '../../providers/electron.service';
import { ErrorService } from '../../providers/error.service';
import { NotificationService } from '../../providers/notification.service';

declare let QRCode: any;

@Component({
  selector: 'app-manage-account',
  templateUrl: './manage-account.component.html',
})

export class ManageAccountComponent {
  account;
  sub;
  public helpers = helpers;

  constructor(
    private router: Router,
    public wallet: WalletService,
    private route: ActivatedRoute,
    private electron: ElectronService,
    private notification: NotificationService,
    private errorService: ErrorService
  ) {

  }

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
      const address = params['address'];
      for (let i = 0; i < this.wallet.accounts.length; i++) {
        if (this.wallet.accounts[i].address === address) {
          this.account = this.wallet.accounts[i];
          break;
        }
      }
      if (!this.account) this.router.navigate(['/dashboard']);
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  ngAfterViewInit() {
    this.showQrCode();
  }

  async copyAddress() {
    if (this.account) {
      this.electron.clipboard.writeText(this.account.address);
      this.notification.notify('success', 'NOTIFICATIONS.ADDRESSCOPIEDCLIPBOARD');
    }
  }

  renameAccount() {
    if (this.account) {
      try {
        this.wallet.updateAddressAccount(this.account.mainAddress);
      } catch (ex) {
        this.errorService.diagnose(ex);
      }
    }
  }

  showQrCode() {
    if (document.getElementById('qrcode') && this.account) {
      new QRCode("qrcode", {
        text: this.account.address,
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
      });
    } else {
      setTimeout(() => this.showQrCode(), 500);
    }
  }


}
