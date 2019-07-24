import { Component } from '@angular/core';
import { WalletService } from '../../providers/wallet.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ElectronService } from 'app/providers/electron.service';
import { ErrorService } from 'app/providers/error.service';
import { NotificationService } from 'app/providers/notification.service';
import { Transaction, Account } from '../../classes';
import { CurrencyService } from 'app/providers/currency.service';

declare let QRCode: any;

@Component({
  selector: 'app-manage-account',
  templateUrl: './manage-account.component.html',
})

export class ManageAccountComponent {
  account: Account;
  sub;
  tab = 0;
  // transactions tab
  skipTransactions = 10;
  transactions = [];
  loadingTransactions = false;
  transactionSub;

  constructor(
    private router: Router,
    public wallet: WalletService,
    private route: ActivatedRoute,
    private electron: ElectronService,
    private notification: NotificationService,
    private errorService: ErrorService,
    public currencyService: CurrencyService
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
      if (!this.account) this.router.navigate(['/metrix/dashboard']);
    });

    this.transactionSub = this.wallet.transactionsUpdated.subscribe(() => {
      if (this.tab === 1) this.getTransactionsToShow();
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.sub.unsubscribe();
    this.wallet.cleanupTransactions();
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
      setTimeout(() => this.showQrCode(), 100);
    }
  }

  changeTab(tab: number) {
    if (this.tab !== 0 && tab === 0) this.showQrCode();
    if (this.tab !== 1 && tab === 1) this.getTransactionsToShow();
    this.tab = tab;
  }

  getTransactionsToShow() {
    let transactions = [];
    this.wallet.transactions.forEach((trx: Transaction) => {
      if (this.account.hasAddress(trx.address)) transactions.push(trx);
    })
    this.transactions = transactions;
  }

  async fetchMoreTransactions(event) {
    if (this.loadingTransactions || event.end !== this.transactions.length - 1) return;
    this.loadingTransactions = true;
    try {
      await this.wallet.getTransactions(10, this.skipTransactions);
      this.skipTransactions += 10;
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
    this.loadingTransactions = false;
  }


}
