import { Component, ChangeDetectorRef } from '@angular/core';
import { WalletService, DATASYNCTYPES } from '../../providers/wallet.service';
import Helpers from 'app/helpers';
import { PromptService } from '../../components/prompt/prompt.service';
import { ContextMenuService } from 'app/components/context-menu/context-menu.service';
import { ErrorService } from 'app/providers/error.service';
import { NotificationService } from 'app/providers/notification.service';
import { ElectronService } from '../../../providers/electron.service';

@Component({
  templateUrl: './masternodes.component.html',
  styleUrls: ['./masternodes.component.scss']
})
export class MasternodesComponent {
  // make helpers accessible for html
  helpers = Helpers;
  // sort masternode list
  desc = false;
  sortField;
  // filter masternode list
  searchFilter = '';
  // filtered masternode list
  items;
  // my online masternode list
  myMasternodes = [];
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
    private notification: NotificationService,
    private contextMenu: ContextMenuService,
    private errorService: ErrorService,
    private electronService: ElectronService
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
    let masternodes = [];
    let ipList = [];

    // get ips for all masternodes in my masternode.conf file
    this.wallet.masternode.config.forEach(mn => ipList.push(mn.address))
    this.wallet.masternode.list.forEach(mn => {
      // check if it is in my masternode.conf file
      if (ipList.indexOf(mn.address) > -1) {
        ipList.splice(ipList.indexOf(mn.address), 1);
        // add alias to masternode for context menu
        for (let i = 0; i < this.wallet.masternode.config.length; i++) {
          const mnConf = this.wallet.masternode.config[i];
          if (mnConf.address === mn.address) {
            mn['alias'] = mnConf.alias
          }
        }
        masternodes.push(mn)
      }
    })
    // add any other masternodes from conf file not in mn list
    this.wallet.masternode.config.forEach(mn => {
      if (ipList.indexOf(mn.address) > -1) {
        masternodes.push(mn);
      }
    })

    this.myMasternodes = masternodes;
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
    let items = []
    if (masternode && masternode.alias) {
      items = [
        !masternode.enabled ? {
          name: 'PAGES.MASTERNODES.STARTALIASBUTTON',
          func: () => this.startAlias(masternode.alias)
        } :
          {
            name: 'PAGES.MASTERNODES.STOPALIASBUTTON',
            func: () => this.stopAlias(masternode.alias)
          },
        {
          name: 'PAGES.MASTERNODES.REMOVEMN',
          func: () => this.removeMasternode(masternode.alias)
        },
      ]
    } else if (this.wallet.masternode.running) {
      items = [
        {
          name: 'PAGES.MASTERNODES.STOPBUTTON',
          func: () => this.stop()
        }
      ]
    }

    if (items.length) this.contextMenu.show(e, items)
  }

  start() {
    this.sendStart("start");
  }

  startAlias(alias: string) {
    this.sendStart("start-alias", [alias]);
  }

  stop() {
    this.sendStop("stop");
  }

  stopAlias(alias: string) {
    this.sendStop("stop-alias", [alias]);
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
        this.wallet.requestDataSync(DATASYNCTYPES.MASTERNODE);
      } catch (ex) {
        this.errorService.diagnose(ex);
      }
    } catch (ex) {
      // passphrase prompt closed
    }
  }

  async sendStop(cmd, params = []) {
    try {
      if (this.wallet.requireUnlock()) {
        const [passphrase, stakingOnly] = await this.prompt.getPassphrase();
        params.push(passphrase);
      }

      this.notification.loading('NOTIFICATIONS.STOPPINGMASTERNODE');
      try {
        const res = await this.wallet.masternodeCMD(cmd, params);
        if (res.result === "failed") return this.notification.notify('error', res.errorMessage, false);
        if (res.overall) return this.notification.notify('default', res.overall, false);
        if (res.result === "successful") return this.notification.notify('success', res.alias + ' ' + res.result, false);
        this.notification.notify('default', res, false);
        this.wallet.requestDataSync(DATASYNCTYPES.MASTERNODE);
      } catch (ex) {
        this.errorService.diagnose(ex);
      }
    } catch (ex) {
      // passphrase prompt closed
    }
  }

  async removeMasternode(alias) {
    try {
      const res = await this.wallet.masternodeCMD('removeremote', [alias]);
      if (res === "Masternode not found") return this.notification.notify('error', res, false);
      this.wallet.requestDataSync(DATASYNCTYPES.MASTERNODELISTCONF);
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
  }

  async addRemote() {
    try {
      const [alias, ip, key, txHash, txIndex] = await this.prompt.addRemoteMasternode();
      if (alias && ip && key && txHash && txIndex) {
        const res = await this.wallet.masternodeCMD('addremote', [alias, ip, key, txHash, txIndex]);
        if (res !== "Masternode created") return this.notification.notify('error', res, false);
        this.wallet.requestDataSync(DATASYNCTYPES.MASTERNODELISTCONF);
      }
    } catch (ex) {
      // prompt closed
    }
  }

  async setupLocal() {
    if (!this.electronService.publicIP) {
      return this.notification.notify('error', 'NOTIFICATIONS.NOPUBLICUP');
    }
    this.notification.loading('NOTIFICATIONS.CONFIGURINGLOCALMN');
    try {
      // get priv key
      const privKey = await this.wallet.masternodeCMD('genkey');
      // enable mn
      const addr = this.electronService.publicIP + ':33820';
      await this.wallet.masternodeCMD('init', [privKey, addr]);
      // write conf file
      this.electronService.ipcRenderer.send('client-node', 'MASTERNODE', { destroy: false, key: privKey, ip: addr });
      this.wallet.requestDataSync(DATASYNCTYPES.MASTERNODE);
      this.notification.dismissNotifications();
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
  }

  async disableLocal() {
    this.notification.loading('NOTIFICATIONS.CONFIGURINGLOCALMN');
    try {
      // kill mn
      await this.wallet.masternodeCMD('kill');
      // write conf file
      this.electronService.ipcRenderer.send('client-node', 'MASTERNODE', { destroy: true });
      this.wallet.requestDataSync(DATASYNCTYPES.MASTERNODE);
      this.notification.dismissNotifications();
    } catch (ex) {
      this.errorService.diagnose(ex);
    }
  }

  public get canStartLocalMN() {
    return Object.keys(this.wallet.masternode.outputs).length
  }


}
