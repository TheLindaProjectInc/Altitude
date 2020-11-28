import { Component, isDevMode } from '@angular/core';
import { ErrorService } from 'app/providers/error.service';
import { NotificationService } from 'app/providers/notification.service';
import Helpers from 'app/helpers';
import { first } from 'rxjs/operators';
import { DGPService, EnrollmentStatus } from 'app/dgp/providers/dgp.service';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { PromptService } from 'app/components/prompt/prompt.service';

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

    await this.dgpService.onDGPInfo.pipe(first()).toPromise()

    if (!this.enrollmentTxid) {
      let transactions = this.wallet.transactions.filter(e => e.confirmations === 0);
      for (let i = 0; i < transactions.length; i++) {
        let trx = transactions[i];
        if (trx.amount.abs().eq(this.governanceCollateral)) {
          if (await this.checkPendingEnrollmentStatus(trx.txId)) return;
        }
      }
    } else {
      await this.checkPendingEnrollmentStatus(this.enrollmentTxid);
    }
  }

  private async checkPendingEnrollmentStatus(txid: string) {
    let enrollmentStatus = await this.dgpService.checkGovernanceEnrollmentStatus(txid);

    if (enrollmentStatus === EnrollmentStatus.PENDING) {
      this.enrollmentTxid = txid;
    } else if (enrollmentStatus === EnrollmentStatus.CONFIRMED) {
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
    return Helpers.fromSatoshi(this.dgpService.dgpInfo.governancecollateral);
  }

  public get canEnroll(): boolean {
    if (this.enrollmentTxid) return false;
    return true;
  }

  public get lastPing(): number {
    return this.wallet.blockchainStatus.latestBlockHeight - this.dgpService.governor.lastPing
  }

  public get lastPingDays(): number {
    return (this.wallet.blockchainStatus.latestBlockHeight - this.dgpService.governor.lastPing) / 960;
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

  public async ping() {
    let passphrase;
    try {
      if (this.wallet.requireUnlock()) [passphrase,] = await this.prompt.getPassphrase();
    } catch (ex) {
      // passphrase prompt closed
      return;
    }

    this.notification.loading('DGP.NOTIFICATIONS.PINGINGGOVERNOR');

    try {
      await this.dgpService.ping(passphrase);
      this.notification.notify('success', 'DGP.NOTIFICATIONS.PINGEDGOVERNOR');
    } catch (ex) {
      if (isDevMode()) console.log(ex);
      this.errorService.diagnose(ex);
    }
  }

  public async unenroll() {
    if (this.lastPing < Helpers.params.governance.maturity) {
      return this.notification.notify('default', 'DGP.NOTIFICATIONS.GOVERNORNOTMATURE');
    }

    try {
      await this.prompt.alert('COMPONENTS.PROMPT.UNENROLLGOVERNORTITLE', 'COMPONENTS.PROMPT.UNENROLLGOVERNORCONTENT', 'DGP.PAGES.GOVERNANCE.UNENROLL', 'MISC.CANCELBUTTON');
    } catch (ex) {
      return;
    }

    let passphrase;
    try {
      if (this.wallet.requireUnlock()) [passphrase,] = await this.prompt.getPassphrase();
    } catch (ex) {
      // passphrase prompt closed
      return;
    }

    this.notification.loading('DGP.NOTIFICATIONS.UNENROLLINGGOVERNOR');

    try {
      await this.dgpService.unenrollGovernor(passphrase);
      this.notification.notify('success', 'DGP.NOTIFICATIONS.UNENROLLEDGOVERNOR');
    } catch (ex) {
      if (isDevMode()) console.log(ex);
      this.errorService.diagnose(ex);
    }

  }

}
