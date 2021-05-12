import { Component } from '@angular/core';
import { ErrorService } from 'app/providers/error.service';
import { NotificationService } from 'app/providers/notification.service';
import { BuyService } from '../../providers/buy.service';
import Helpers from 'app/helpers';
import Big from 'big.js';
import { ElectronService } from 'app/providers/electron.service';
import { AddressBookService } from 'app/metrix/components/address-book/address-book.service';

@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  sendAmount;
  receiveAmount;
  MRXAddress;
  estimateTimeout;
  swapCurrency = 'BTC';
  swapAddresses = [];

  constructor(
    private addressBook: AddressBookService,
    private buyService: BuyService,
    private errorService: ErrorService,
    private notification: NotificationService,
    private electron: ElectronService,
  ) {
  }

  ngOnDestroy() {
    this.clearTimeout()
  }

  clearTimeout() {
    if (this.estimateTimeout) clearTimeout(this.estimateTimeout);
  }

  setSwapCurrency(BTC) {
    this.clearTimeout()
    this.sendAmount = '';
    this.receiveAmount = '';
    if (BTC) {
      this.swapCurrency = 'BTC';
    } else {
      this.swapCurrency = 'USD';
    }
  }

  getEstimate(isMRX) {
    this.clearTimeout();

    // we cannot convert from USD to MRX
    if (isMRX && this.swapCurrency === 'USD') {
      this.sendAmount = '';
      this.receiveAmount = '';
      return
    };

    let amount = isMRX ? Number(this.receiveAmount.replace(/,/g, "")) : Number(this.sendAmount.replace(/,/g, ""))
    if (amount) {
      if (!isMRX) {
        this.receiveAmount = '...'
        this.sendAmount = Helpers.prettyCoins(Big(amount));
      } else {
        this.sendAmount = '...';
        this.receiveAmount = Helpers.prettyCoins(Big(amount));
      }
      this.estimateTimeout = setTimeout(async () => {
        try {
          let estimate: any = await this.buyService.estimate(amount, isMRX ? 'MRX' : this.swapCurrency)
          let result = Helpers.prettyCoins(Big(estimate.amount));
          if (!isMRX) this.receiveAmount = result;
          else this.sendAmount = result;
        } catch (ex) {
          this.errorService.diagnose(ex);
        }
      }, 1000);
    }
  }

  submitSwap() {
    if (!this.MRXAddress) return this.notification.notify("default", "BUY.NOTIFICATIONS.NOADDRESS")
    if (this.swapCurrency === 'USD') {
      this.swapUSD();
    } else {
      this.swapBTC()
    }
  }

  async swapBTC() {
    try {
      if (!this.swapAddresses.find(a => { return a.MRX === this.MRXAddress })) {
        this.notification.loading("BUY.NOTIFICATIONS.GETTINGSWAPADDRESS");
        let swap: any = await this.buyService.getSwapAddress(this.MRXAddress);
        this.swapAddresses.push({ MRX: this.MRXAddress, BTC: swap.address });
        this.MRXAddress = '';
        this.notification.dismissNotifications();
      } else {
        // already have address
        this.notification.notify("default", "BUY.NOTIFICATIONS.ALREADYHAVEADDRESS")
      }
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
  }

  async swapUSD() {
    if (!this.validateUSD()) return;
    let amount = Number(this.sendAmount.replace(/,/g, ""))
    const url = `https://buy.metrixcoin.com?a=${amount}&c=USD&d=${this.MRXAddress}`;
    try {
      this.electron.shell.openExternal(url);
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
  }

  validateUSD() {
    let amount = Number(this.sendAmount.replace(/,/g, ""))
    if (!amount || amount < 50) {
      this.notification.notify("error", "BUY.NOTIFICATIONS.SWAPUSDMIN");
      return false;
    } else if (amount > 3000) {
      this.notification.notify("error", "BUY.NOTIFICATIONS.SWAPUSDMAX");
      return false;
    }
    return true;
  }

  async copyAddress(address) {
    this.electron.clipboard.writeText(address);
    this.notification.notify('success', 'NOTIFICATIONS.ADDRESSCOPIEDCLIPBOARD');
  }

  async openAddressBook(): Promise<void> {
    const addr = await this.addressBook.getAddress(false);
    if (addr) this.MRXAddress = addr.address;
  }

  moreInformation() {
    this.electron.shell.openExternal('https://buy.metrixcoin.com/');
  }

  participatingCountries() {
    this.electron.shell.openExternal('https://buy.metrixcoin.com/faq.html#unsupported');
  }

}
