import { Component, isDevMode } from '@angular/core';
import { ErrorService } from 'app/providers/error.service';
import { NotificationService } from 'app/providers/notification.service';
import Helpers from 'app/helpers';
import { DGPService } from 'app/dgp/providers/dgp.service';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { PromptService } from 'app/metrix/components/prompt/prompt.service';
import { RPCMethods } from 'app/metrix/providers/rpc.service';

@Component({
  templateUrl: './governance.component.html',
  styleUrls: ['./governance.component.scss']
})
export class GovernanceComponent {

  isEnrolling: boolean = false;
  enrollmentTxid: string;
  newBlockReceivedSub;

  constructor(
    private prompt: PromptService,
    private dgpService: DGPService,
    private errorService: ErrorService,
    private notification: NotificationService,
    private wallet: WalletService,
  ) {
    this.newBlockReceivedSub = this.wallet.newBlockReceived.subscribe(() => {
      this.checkPendingEnrollment();
    });
  }

  ngOnDestroy() {
    this.newBlockReceivedSub.unsubscribe();
  }

  private async checkPendingEnrollment() {
    if (this.isGovernor) return;

    if (!this.enrollmentTxid) {
      let transactions = this.wallet.transactions;
      let govAmount = -1 * this.governanceCollateral;
      for (let i = 0; i < transactions.length; i++) {
        let trx = transactions[i];
        if (trx.amount.eq(govAmount)) {
          if (await this.checkPendingEnrollmentStatus(trx.txId)) return;
        }
      }
    } else {
      await this.checkPendingEnrollmentStatus(this.enrollmentTxid);
    }
  }

  private async checkPendingEnrollmentStatus(txid: string) {
    let enrollmentStatus = await this.dgpService.checkGovernanceEnrollmentStatus(txid);
    if (enrollmentStatus === 0) { // is pending enrollment
      this.enrollmentTxid = txid;
    } else if (enrollmentStatus === 1) { // enrollment confirmed
      this.enrollmentTxid = null;
    } else {
      return false;
    }
    return true;
  }

  public get isGovernor(): boolean {
    return !!this.dgpService.governor
  }

  public get governanceCollateral(): number {
    if (!this.dgpService.dgpInfo) return 0;
    return Helpers.prettyCoins(Helpers.fromSatoshi(this.dgpService.dgpInfo.governancecollateral));
  }

  public get canEnroll(): boolean {
    if (this.enrollmentTxid) return false;
    return true;
  }

  public async enroll() {
    let passphrase;
    try {
      if (this.wallet.requireUnlock()) [passphrase,] = await this.prompt.getPassphrase();
    } catch (ex) {
      // passphrase prompt closed
      return;
    }

    this.notification.loading('DGP.NOTIFICATIONS.ENROLLINGGOVERNOR');

    try {
      const res = await this.dgpService.enrollGovernor(passphrase);
      this.enrollmentTxid = res.txid;
      this.notification.notify('success', 'DGP.NOTIFICATIONS.ENROLLEDGOVERNOR');
      this.isEnrolling = false;
    } catch (ex) {
      if (isDevMode()) console.log(ex);
      this.errorService.diagnose(ex);
    }
  }




}
