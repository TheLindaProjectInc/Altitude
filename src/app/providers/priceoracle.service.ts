import { Injectable } from '@angular/core';
import {
    APIProvider,
    NetworkType,
    Provider,
  } from '@metrixcoin/metrilib';
import { getPriceOracle, MRXtoUSDOracle } from '@metrixnames/pricelib';
import { ElectronService } from 'app/providers/electron.service';
import { ChainType } from '../enum';

@Injectable()
export class PriceOracle {

    public priceOracleFailed = false;
    public oracle: MRXtoUSDOracle | undefined;
    private provider: Provider;
    private network: NetworkType | 'RegTest';
    
    constructor(
        private electron: ElectronService
    ) {
        this.initOracle();
    }

    async initOracle() {
        this.priceOracleFailed = false;
        if (this.electron.chain === ChainType.MAINNET) {this.network = 'MainNet';}
        if (this.electron.chain === ChainType.TESTNET) {this.network = 'TestNet';}
        if (this.electron.chain === ChainType.REGTEST) {this.network = 'RegTest';}
        try {
            this.provider = new APIProvider('MainNet');
            if (this.network == 'TestNet' || this.network == 'RegTest') {
                this.oracle = undefined;
                return;
            }
            this.oracle = getPriceOracle(this.network, this.provider);
        } catch (ex) {
            this.priceOracleFailed = true;
            console.log(ex);
        }
    }
}