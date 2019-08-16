import { Component } from '@angular/core';

import { WalletService } from '../../providers/wallet.service';
import { CurrencyService } from 'app/providers/currency.service';

@Component({
  selector: 'side-bar',
  templateUrl: './side-bar.component.html',
})

export class SideBarComponent {

  constructor(
    public wallet: WalletService,
    public currencyService: CurrencyService
  ) {

  }

}
