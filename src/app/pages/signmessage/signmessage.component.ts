import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NotifierService } from 'angular-notifier';
import { WalletService } from '../../providers/wallet.service';
import { PromptService } from '../../components/prompt/prompt.service';
import { ErrorService } from '../../providers/error.service';
import { AddressBookService } from '../../components/address-book/address-book.service';
import { NotificationService } from '../../providers/notification.service';

@Component({
  selector: 'app-signmessage',
  templateUrl: './signmessage.component.html',
})

export class SignMessageComponent {

  sub;
  tab = 0;
  sign = {
    address: '',
    message: '',
    signature: ''
  }
  verify = {
    address: '',
    message: '',
    signature: '',
    result: null
  }

  constructor(
    private route: ActivatedRoute,
    private notifier: NotifierService,
    private wallet: WalletService,
    private prompt: PromptService,
    private addressBook: AddressBookService,
    private errorService: ErrorService,
    private notification: NotificationService,
  ) {

  }

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
      this.tab = Number(params['tab']);
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  sign_reset() {
    this.sign.address = '';
    this.sign.message = '';
    this.sign.signature = '';
  }

  async getFromAddressBook(sign) {
    const addr = await this.addressBook.getAddress(false);
    if (addr && sign) this.sign.address = addr.address;
    if (addr && !sign) this.verify.address = addr.address;
  }

  async signMessage() {
    console.log(this.sign)
    if (!this.sign.address || !this.sign.message)
      return this.notification.notify('error', 'NOTIFICATIONS.EMPTYFIELDS');

    try {
      let passphrase, stakingOnly;
      if (this.wallet.requireUnlock()) [passphrase, stakingOnly] = await this.prompt.getPassphrase();
    
      this.notification.loading('NOTIFICATIONS.SIGNINGMESSAGE');
      try {
        const result = await this.wallet.signMessage(this.sign.address, this.sign.message, passphrase);
        this.sign.signature = result
        this.notification.notify('success', 'NOTIFICATIONS.SIGNEDMESSAGE');
      } catch (ex) {
        this.errorService.diagnose(ex);
      }
    } catch (ex) {
      // passphrase prompt closed
    }
  }

  verify_reset() {
    this.verify.address = '';
    this.verify.message = '';
    this.verify.signature = '';
    this.verify.result = null;
  }

  async verifyMessage() {
    this.verify.result = null;

    if (!this.verify.address || !this.verify.message || !this.verify.signature)
      return this.notification.notify('error', 'NOTIFICATIONS.EMPTYFIELDS');

    this.notification.loading('NOTIFICATIONS.VERIFYINGMESSAGE');
    try {
      let result = await this.wallet.verifyMessage(this.verify.address, this.verify.message, this.verify.signature);
      if (result === true) this.verify.result = true;
      else this.verify.result = false;
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
    this.notification.dismissNotifications()

  }


}

