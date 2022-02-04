import { Component, ChangeDetectorRef } from '@angular/core';

import { RpcService } from '../../providers/rpc.service';
import { WalletService } from '../../providers/wallet.service';
import Helpers from 'app/helpers';
import { EncryptionStatus } from '../../classes';

@Component({
  selector: 'sync-status',
  templateUrl: './sync-status.component.html',
})

export class SyncStatusComponent {

  public helpers = Helpers;
  public dateNow;

  changeTimer;

  constructor(
    public rpc: RpcService,
    public wallet: WalletService,
    private cdRef: ChangeDetectorRef
  ) {

  }

  ngOnInit() {
    this.changeTimer = setInterval(() => {
      this.cdRef.detectChanges();
    },10000)
  }

  ngOnDestroy() {
    clearInterval(this.changeTimer);
  }

  ngAfterViewChecked() {
    this.dateNow = new Date();
    this.cdRef.detectChanges();
  }

  get lockStatus() {
    let iconClass = 'danger';
    let title = 'COMPONENTS.SIDEBAR.STATUS.UNENCRYPTED';
    let iconName = 'lock-open';

    switch (this.wallet.walletInfo.encryption_status) {
      case EncryptionStatus.LOCKED:
      case EncryptionStatus.ENCRYPTING:
        iconClass = 'success';
        title = 'COMPONENTS.SIDEBAR.STATUS.LOCKED';
        iconName = 'lock';
        break;
      case EncryptionStatus.LOCKEDFORSTAKING:
        iconClass = 'success';
        title = 'COMPONENTS.SIDEBAR.STATUS.UNLOCKEDSTAKING';
        iconName = 'unlock';
        break;
      case EncryptionStatus.UNLOCKED:
        iconClass = 'danger';
        title = 'COMPONENTS.SIDEBAR.STATUS.UNLOCKED';
        iconName = 'unlock';
        break;
    }

    return {
      class: iconClass,
      title: title,
      icon: iconName
    }
  }

  get stakingStatus() {
    let flag = this.wallet.stakingStatus.staking;
    let iconClass = flag ? 'success' : 'danger';
    let title = flag ? 'COMPONENTS.SIDEBAR.STATUS.STAKING' : 'COMPONENTS.SIDEBAR.STATUS.NOTSTAKING';
    return {
      class: iconClass,
      title: title,
      icon: 'coins'
    }
  }

  get progressTitle() {
    return Math.round(this.wallet.blockchainStatus.syncProgresss * 100) / 100 + '%';
  }

  get showProgressBar() {
    return this.wallet.running &&
      (Date.now() - this.wallet.blockchainStatus.latestBlockTime > 5 * 60 * 1000 && this.wallet.blockchainStatus.syncProgresss < 99.99)
  }
}
