import { Component } from '@angular/core';
import { WalletService } from '../../providers/wallet.service';
import { NgxSmartModalService } from 'ngx-smart-modal';
import { NotificationService } from '../../providers/notification.service';
import { ElectronService } from '../../providers/electron.service';
import { AddressBookService } from './address-book.service';
import { ErrorService } from '../../providers/error.service';

@Component({
  selector: 'address-book',
  templateUrl: './address-book.component.html',
})
export class AddressBookComponent {

  promiseResolve;

  showSending;

  tab = 0;

  newAddress = ""
  newLabel = ""

  constructor(
    private wallet: WalletService,
    private notification: NotificationService,
    private ngxModal: NgxSmartModalService,
    private addressBook: AddressBookService,
    private electron: ElectronService,
    private errorService: ErrorService
  ) {
    addressBook.getAddress = (showSending) => this.getAddress(showSending);
  }

  show() {
    this.tab = 0
    this.reset();
    this.ngxModal.getModal('addressBookModal').open();
  }

  hide() {
    this.ngxModal.getModal('addressBookModal').close();
  }

  async addAddress() {
    if (!this.newAddress || !this.newLabel) return this.notification.notify('error', 'NOTIFICATIONS.EMPTYFIELDS');
    try {
      await this.wallet.addressBookAdd(this.newAddress, this.newLabel);
      this.newAddress = "";
      this.newLabel = "";
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
  }

  async copyAddress(address) {
    this.electron.clipboard.writeText(address.address);
    this.notification.notify('success', 'NOTIFICATIONS.ADDRESSCOPIEDCLIPBOARD');
  }

  deleteAddress(address) {
    try {
      this.wallet.addressBookRemove(address.address);
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
  }

  reset() {
    this.newAddress = "";
    this.newLabel = "";
  }

  cancel() {
    this.hide();
    this.promiseResolve("")
  }

  selectAddress(address) {
    this.hide();
    this.promiseResolve({ address: address.address, label: address.name })
  }

  async getAddress(showSending = true) {
    return new Promise((resolve, reject) => {
      this.showSending = showSending;
      this.show();
      this.promiseResolve = resolve;
    })
  }

}
