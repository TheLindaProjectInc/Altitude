import { CurrencyService } from './../../../providers/currency.service';
import { Component } from '@angular/core';
import { WalletService } from 'app/metrix/providers/wallet.service';

@Component({
  selector: 'buy-side-bar',
  templateUrl: './side-bar.component.html',
})

export class SideBarComponent {

  constructor(
    public wallet: WalletService,
    public currencyService: CurrencyService
  ) {

  }

}
