import { Injectable } from '@angular/core';
import { WalletService } from './wallet.service';
import { HttpClient } from '@angular/common/http';
import { ElectronService, ClientStatus } from 'app/providers/electron.service';

@Injectable()
export class MainChainService {
    public notOnMainChainCounter = 0;
    private hasCheckedOnce = false;
    private checkTimer;

    constructor(
        public wallet: WalletService,
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

    get isOnMainChain() {
        return this.notOnMainChainCounter === 0;
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
                    this.notOnMainChainCounter++;
                } else {
                    this.notOnMainChainCounter = 0;
                }

                this.hasCheckedOnce = true;
            } else {
                this.notOnMainChainCounter = 0;
            }
        } catch (ex) {
            this.notOnMainChainCounter = 0;
        }

        let timeout: number;
        if (!this.hasCheckedOnce) timeout = 10 * 1000;    // first check asap at least one check straight away then check every 10 minutes
        else if (this.notOnMainChainCounter > 0) timeout = 5 * 60 * 1000;  // check in 5 minutes if on side chain
        else timeout = 30 * 60 * 1000;  // otherwise check in 30 minutes

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
}