import { Component, ChangeDetectorRef } from '@angular/core';
import { WalletService } from '../../providers/wallet.service';
import Helpers from '../../helpers';
import { PromptService } from '../../components/prompt/prompt.service';
import { NotifierService } from 'angular-notifier';
import { ContextMenuService } from '../../components/context-menu/context-menu.service';
import { ErrorService } from '../../providers/error.service';
import { NotificationService } from '../../providers/notification.service';

@Component({
  selector: 'app-masternodes',
  templateUrl: './masternodes.component.html'
})
export class MasternodesComponent {
  // make helpers accessible for html
  helpers = Helpers;
  // sport masternode list
  desc = false;
  sortField;
  // filter masternode list
  searchFilter = '';
  // filtered masternode list
  items;
  // my online masternode list
  items_me;
  // my offline masternode list
  items_me_off;
  // subscribe to masternode changes from wallet to update list
  sub;
  // which tab to show
  tab = 0;
  // cache now to avoid angular 'update has changed' errors when showing time eplased
  dateNow;

  constructor(
    public wallet: WalletService,
    private cdRef: ChangeDetectorRef,
    private prompt: PromptService,
    private notifier: NotifierService,
    private notification: NotificationService,
    private contextMenu: ContextMenuService,
    private errorService: ErrorService
  ) { }

  ngAfterViewChecked() {
    this.dateNow = new Date();
    this.cdRef.detectChanges();
  }

  ngOnInit() {
    this.items = this.wallet.masternode.list;
    this.getMyList();

    this.sub = this.wallet.masternodeListUpdated.subscribe(() => {
      this.items = this.wallet.masternode.list;
      this.checkSort();
      this.filter();
      this.getMyList();
    });
  }

  getMyList() {
    let items = [];
    let itemsOffline = [];
    let ipList = [];
    // get ips for all masternodes in my masternode.conf file
    this.wallet.masternode.config.forEach(mn => ipList.push(mn.address))
    this.wallet.masternode.list.forEach(mn => {
      // check if i'm running a masternode. will have the 'status' field
      if (mn.status !== undefined) items.push(mn);
      else if (ipList.indexOf(mn.address) > -1) { // or check if it is in my masternode.conf file
        ipList.splice(ipList.indexOf(mn.address), 1);
        // add alias to masternode for context menu
        for (let i = 0; i < this.wallet.masternode.config.length; i++) {
          const mnConf = this.wallet.masternode.config[i];
          if (mnConf.address === mn.address) {
            mn['alias'] = mnConf.alias
          }
        }
        items.push(mn)
      }
    })
    this.wallet.masternode.config.forEach(mn => {
      if (ipList.indexOf(mn.address) > -1) {
        itemsOffline.push(mn);
      }
    })

    this.items_me = items;
    this.items_me_off = itemsOffline;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  sort(field) {
    this.sortField = field;
    this.desc = !this.desc;
    this.checkSort();
  }

  filter() {
    let items = [];
    this.searchFilter = this.searchFilter.toLowerCase();
    for (let i = 0; i < this.wallet.masternode.list.length; i++) {
      const item = this.wallet.masternode.list[i];
      if (
        !this.searchFilter ||
        item.pubkey.toLowerCase().indexOf(this.searchFilter) > -1 ||
        item.address.toLowerCase().indexOf(this.searchFilter) > -1 ||
        item.protocolVersion.toString().indexOf(this.searchFilter) > -1
      )
        items.push(item);
    }
    this.items = items;
    this.checkSort();
  }

  checkSort() {
    if (this.sortField && this.items.length) {
      this.items = [].concat(this.items).sort((a, b) => {
        if (a[this.sortField] > b[this.sortField]) {
          return !this.desc ? 1 : -1;
        } else if (a[this.sortField] < b[this.sortField]) {
          return this.desc ? 1 : -1;
        } else {
          return 0;
        }
      })
    }
  }

  onRightClick(e, masternode) {
    if (masternode.alias) {
      const items = [{
        name: 'PAGES.MASTERNODES.STARTALIASBUTTON',
        func: () => this.startAlias(masternode.alias)
      }]
      this.contextMenu.show(e, items)
    }
  }

  start() {
    this.sendStart("start");
  }

  startAlias(alias: string) {
    this.sendStart("start-alias", [alias]);
  }

  startAll() {
    this.sendStart("start-many");
  }

  async sendStart(cmd, params = []) {
    try {
      if (this.wallet.requireUnlock()) {
        const [passphrase, stakingOnly] = await this.prompt.getPassphrase();
        params.push(passphrase);
      }

      this.notification.loading('NOTIFICATIONS.STARTINGMASTERNODE');
      try {
        const res = await this.wallet.masternodeCMD(cmd, params);
        if (res.result === "failed") return this.notification.notify('error', res.errorMessage, false);
        if (res.overall) return this.notification.notify('default', res.overall, false);
        if (res.result === "successful") return this.notification.notify('success', res.alias + ' ' + res.result, false);
        this.notification.notify('default', res, false);
      } catch (ex) {
        this.errorService.diagnose(ex);
      }
      this.notification.dismissNotifications()

    } catch (ex) {
      // passphrase prompt closed
    }
  }


}
