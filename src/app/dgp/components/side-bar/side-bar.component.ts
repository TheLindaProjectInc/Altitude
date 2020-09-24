import { Component } from '@angular/core';

import { WalletService } from 'app/metrix/providers/wallet.service';
import { CurrencyService } from 'app/providers/currency.service';

@Component({
  selector: 'dgp-side-bar',
  templateUrl: './side-bar.component.html',
})

export class SideBarComponent {

  constructor(
    public wallet: WalletService,
    public currencyService: CurrencyService
  ) {

  }

}
