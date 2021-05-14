import { Component } from '@angular/core';
import { ErrorService } from 'app/providers/error.service';
import { NotificationService } from 'app/providers/notification.service';
import { BuyService } from '../../providers/buy.service';
import Helpers from 'app/helpers';
import Big from 'big.js';
import { ElectronService } from 'app/providers/electron.service';
import { AddressBookService } from 'app/metrix/components/address-book/address-book.service';
import { TranslationService } from 'app/providers/translation.service';

@Component({
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent {

  searchAddress: string;
  transactions = [];

  constructor(
    private addressBook: AddressBookService,
    private buyService: BuyService,
    private electron: ElectronService,
    private translation: TranslationService
  ) {
  }

  ngOnDestroy() {
    
  }

  onSearch() {
    if(this.searchAddress) {
      this.search();
    }
  }

  async search() {
    this.transactions = []
    let data: any = await this.buyService.getHistory(this.searchAddress);
    if (data) {
      for(let i = 0; i < data.length; i++) {
        let trx = data[i];
        let btcExplorerLink = trx.depositTxId ? 'https://www.blockchain.com/btc/tx/' + trx.depositTxId : '';
        const confirmed = await this.translation.translate('BUY.PAGES.HISTORY.TRANSACTIONCONFIRMED');
        const notConfirmed = await this.translation.translate('BUY.PAGES.HISTORY.TRANSACTIONNOTCONFIRMED');
        let btcStatus = trx.confirmed ? confirmed : notConfirmed;
        if (!trx.confirmed) btcStatus = trx.confirmations || 0
        const deposit = await this.translation.translate('BUY.PAGES.HISTORY.TRANSACTIONDEPOSIT');
        const swap = await this.translation.translate('BUY.PAGES.HISTORY.TRANSACTIONSWAP');
        this.transactions.push({type: deposit, amount: trx.depositAmount, txid: trx.depositTxId, coin: trx.depositCoin, date: trx.createdAt, status: btcStatus, link: btcExplorerLink});
        // Add Deposit TX
        if (!trx.pending && trx.swapFee < 1) {
          let price = (Number(trx.depositAmount) * (1 - trx.swapFee)) / Number(trx.SwapAmount);
          let mrxExplorerLink = trx.swapTxId ? 'https://explorer.metrixcoin.com/tx/' + trx.swapTxId : '';
          this.transactions.push({type: swap, date: trx.createdAt, amount: trx.SwapAmount, txid: trx.swapTxId, price: price, link: mrxExplorerLink});
        } else if (!trx.pending && trx.swapFee > 0) {
          const refund = await this.translation.translate('BUY.PAGES.HISTORY.TRANSACTIONREFUNDED');
          this.transactions.push({type: swap, status: refund});
        }
      }
    }
  }

  async openAddressBook(): Promise<void> {
    const addr = await this.addressBook.getAddress(false);
    if (addr) this.searchAddress = addr.address;
  }

  openLink(link) {
    this.electron.shell.openExternal(link);
  }
}
