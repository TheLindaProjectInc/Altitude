import { Component } from '@angular/core';

import { WalletService } from '../../providers/wallet.service';
import Helpers from '../../helpers';

@Component({
  selector: 'side-bar',
  templateUrl: './side-bar.component.html',
})

export class SideBarComponent {

  public helpers = Helpers;

  constructor(
    public wallet: WalletService,
  ) {

  }

}
