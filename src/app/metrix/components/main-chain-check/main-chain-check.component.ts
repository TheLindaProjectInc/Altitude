import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService } from '../../providers/wallet.service';
import { HttpClient } from '@angular/common/http';
import { ElectronService, ClientStatus } from 'app/providers/electron.service';

@Component({
  selector: 'metrix-main-chain-check',
  templateUrl: './main-chain-check.component.html',
  styleUrls: ['./main-chain-check.component.scss']
})

export class MainChainCheckComponent {
  public isOnMainChain = true;
  private hasCheckedOnce = false;
  private checkTimer;

  constructor(
    public wallet: WalletService,
    private router: Router,
    private http: HttpClient,
    private electron: ElectronService
  ) {
    this.checkTimer = setTimeout(() => this.checkOnMainChain(), 10 * 1000);

    this.electron.clientStatusEvent.subscribe((status: ClientStatus) => {
      if (status === ClientStatus.RUNNING || status === ClientStatus.RUNNINGEXTERNAL) {
        if (this.checkTimer) clearTimeout(this.checkTimer);
        this.hasCheckedOnce = false;
      }
      this.checkTimer = setTimeout(() => this.checkOnMainChain(), 10 * 1000);
    });
  }

  async checkOnMainChain() {
    try {
      if (this.checkTimer) clearTimeout(this.checkTimer);

      if (this.wallet.blockchainStatus.latestBlockHeight > 0) {
        let checkBlockheight = this.wallet.blockchainStatus.latestBlockHeight;
        let checkBlockHash = this.wallet.blockchainStatus.latestBlockHash;

        // get reference block from explorer
        let explorerBlock: any = await this.getExplorerLastestBlock();

        // check if we need to compare different blocks
        if (checkBlockheight < explorerBlock.height) {
          // get a different block from the explorer
          explorerBlock = await this.getExplorerBlock(checkBlockheight);
        } else {
          // get a different local block
          let localBlock = await this.wallet.getBlockByNumber(explorerBlock.height);
          checkBlockheight = localBlock.height;
          checkBlockHash = localBlock.hash;
        }

        // check if we are on the same chain
        if (checkBlockheight === explorerBlock.height && checkBlockHash !== explorerBlock.hash) {
          this.isOnMainChain = false;
        } else {
          this.isOnMainChain = true;
        }

        this.hasCheckedOnce = true;
      } else {
        this.isOnMainChain = true;
      }

    } catch (ex) {
      this.isOnMainChain = true;
    }

    // do at least one check straight away then check every 10 minutes
    let timeout = 10 * 60 * 1000
    if (!this.hasCheckedOnce) timeout = 10 * 1000;

    this.checkTimer = setTimeout(() => this.checkOnMainChain(), timeout);
  }

  public async getExplorerLastestBlock() {
    return new Promise((resolve, reject) => {
      this.http.get(`https://mystakingwallet.com/api/explorer/latestheight`)
        .subscribe((data: any) => {
          resolve(data);
        }, error => {
          reject(error)
        });
    })
  }

  public async getExplorerBlock(height) {
    return new Promise((resolve, reject) => {
      this.http.get(`https://mystakingwallet.com/api/explorer/block/${height}`)
        .subscribe((data: any) => {
          resolve(data);
        }, error => {
          reject(error)
        });
    })
  }

  goToRecovery() {
    this.router.navigate(['/metrix/tools/3']);
  }

}
