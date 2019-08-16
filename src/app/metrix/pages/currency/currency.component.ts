import { Component } from '@angular/core';
import { ElectronService } from 'app/providers/electron.service';
import { CurrencyService } from '../../../providers/currency.service';

@Component({
  templateUrl: './currency.component.html'
})
export class CurrencyComponent {

  currencies = [];
  search = '';

  constructor(
    private electron: ElectronService,
    public currencyService: CurrencyService
  ) {
  }

  currenciesToShow() {
    let currencies = [];
    const search = this.search.toUpperCase();
    this.currencyService.currencies.forEach(currency => {
      if (!search || currency.indexOf(search) > -1)
        currencies.push(currency);
    });
    return currencies;
  }

  setCurrency(currency) {
    if (this.currencyService.currency !== currency) {
      this.electron.ipcRenderer.send('settings', 'SETCURRENCY', currency);
      this.currencyService.changeCurrency(currency);
    }
  }

}
