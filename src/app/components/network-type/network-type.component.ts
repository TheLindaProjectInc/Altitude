import { Component } from '@angular/core';
import { ElectronService } from 'app/providers/electron.service';
import { ChainType } from 'app/enum';

@Component({
  selector: 'network-type',
  templateUrl: './network-type.component.html',
  styleUrls: ['./network-type.component.scss']
})

export class NetworkTypeComponent {
  constructor(
    private electron: ElectronService
  ) {
  }

  public get chainFriendlyName() {
    if (this.electron.chain === ChainType.TESTNET) return 'Testnet'
    if (this.electron.chain === ChainType.REGTEST) return 'Regtest'
  }

  public get showNetwork() {
    return this.electron.chain !== ChainType.MAINNET
  }

}
