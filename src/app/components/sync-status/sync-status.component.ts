import { Component, ChangeDetectorRef } from '@angular/core';

import { RpcService } from '../../providers/rpc.service';
import { WalletService } from '../../providers/wallet.service';
import Helpers from '../../helpers';
import { EncryptionStatus } from '../../classes';

@Component({
  selector: 'sync-status',
  templateUrl: './sync-status.component.html',
})

export class SyncStatusComponent {

  public helpers = Helpers;
  public dateNow;

  constructor(
    public rpc: RpcService,
    public wallet: WalletService,
    private cdRef: ChangeDetectorRef
  ) {

  }

  ngAfterViewChecked() {
    this.dateNow = new Date();
    this.cdRef.detectChanges();
  }

  get lockStatus() {
    let iconClass = 'danger';
    let title = 'COMPONENTS.SIDEBAR.STATUS.UNENCRYPTED';
    let iconName = 'lock-open';

    switch (this.wallet.walletStatus.encryption_status) {
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
      case EncryptionStatus.UNLOCKEDANONYMONLY:
        iconClass = 'success';
        title = 'COMPONENTS.SIDEBAR.STATUS.UNLOCKEDANON';
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

  get masternodeStatus() {
    let flag = this.wallet.masternode.running;
    let iconClass = flag ? 'success' : 'danger';
    let title = flag ? 'COMPONENTS.SIDEBAR.STATUS.MASTERNODEON' : 'COMPONENTS.SIDEBAR.STATUS.MASTERNODEOFF'
    return {
      class: iconClass,
      title: title,
      icon: 'network-wired'
    }
  }

}
