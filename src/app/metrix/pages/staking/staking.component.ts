import { Component } from '@angular/core';
import { WalletService, DATASYNCTYPES } from '../../providers/wallet.service';
import { PromptService } from '../../../components/prompt/prompt.service';
import { ErrorService } from 'app/providers/error.service';
import { NotificationService } from 'app/providers/notification.service';
import { Input } from '../../classes';

@Component({
  selector: 'app-staking',
  templateUrl: './staking.component.html',
})
export class StakingComponent {
  stakingInputs = [];

  sub;

  constructor(
    public wallet: WalletService,
    private prompt: PromptService,
    private notification: NotificationService,
    private errorService: ErrorService
  ) {
  }

  ngOnInit() {
    this.getPossibleInputs();
    this.sub = this.wallet.accountsUpdated.subscribe(() => this.getPossibleInputs());
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  async unlockForStaking() {
    try {
      const [passphrase, stakingOnly] = await this.prompt.getPassphrase();

      this.notification.loading('NOTIFICATIONS.WALLETUNLOCKING');
      try {
        await this.wallet.unlock(passphrase, true);
        this.wallet.requestDataSync(DATASYNCTYPES.WALLET)
      } catch (ex) {
        this.errorService.diagnose(ex);
      }
      this.notification.dismissNotifications()

    } catch (ex) {
      // passphrase prompt closed
    }
  }

  getPossibleInputs() {
    let inputList = [];
    this.wallet.accounts.forEach(acc => {
      if (acc.balance.gt(0)) {
        acc.addresses.forEach(addr => {
          addr.spendableInputs().forEach(input => {
            if (input.amount.gt(0)) inputList.push(input)
          })
        })
      }
    })
    this.stakingInputs = inputList.sort((a: Input, b: Input) => {
      var m1 = a.isMature;
      var m2 = b.isMature;
      var a1 = Number(a.amount);
      var a2 = Number(b.amount);
      if (m1 < m2) return 1;
      if (m1 > m2) return -1;
      if (a1 < a2) return -1;
      if (a1 > a2) return 1;
      return 0;
    });
  }

}