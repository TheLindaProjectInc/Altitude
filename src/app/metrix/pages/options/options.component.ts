import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ElectronService } from 'app/providers/electron.service';
import { ChainType } from 'app/enum';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { RpcService } from 'app/metrix/providers/rpc.service';
import { DGPService } from 'app/dgp/providers/dgp.service';
import { TokenService } from 'app/token/providers/token.service';
import { NotificationService } from 'app/providers/notification.service';

type ExplorerUrlCategory = 'blockExplorer' | 'tokenDiscovery';
type ExplorerUrlNetwork = 'mainnet' | 'testnet' | 'regtest';

// maps each customisable URL field to its persisted settings key / IPC save command -
// avoids 12 near-identical save/reset methods (one pair per category x network)
const EXPLORER_URL_FIELDS: Record<ExplorerUrlCategory, Record<ExplorerUrlNetwork, { settingKey: string; ipcCmd: string }>> = {
  blockExplorer: {
    mainnet: { settingKey: 'blockExplorerUrlMainnet', ipcCmd: 'SETBLOCKEXPLORERURLMAINNET' },
    testnet: { settingKey: 'blockExplorerUrlTestnet', ipcCmd: 'SETBLOCKEXPLORERURLTESTNET' },
    regtest: { settingKey: 'blockExplorerUrlRegtest', ipcCmd: 'SETBLOCKEXPLORERURLREGTEST' },
  },
  tokenDiscovery: {
    mainnet: { settingKey: 'tokenDiscoveryUrlMainnet', ipcCmd: 'SETTOKENDISCOVERYURLMAINNET' },
    testnet: { settingKey: 'tokenDiscoveryUrlTestnet', ipcCmd: 'SETTOKENDISCOVERYURLTESTNET' },
    regtest: { settingKey: 'tokenDiscoveryUrlRegtest', ipcCmd: 'SETTOKENDISCOVERYURLREGTEST' },
  },
};

@Component({
    selector: 'app-options',
    templateUrl: './options.component.html',
    standalone: false
})
export class OptionsComponent implements OnInit {

  tab = 0;

  proxy = { allow: false, ip: '', port: '' }
  tor = { allow: false, ip: '', port: '' }
  onlyNet = { IPv4: false, IPv6: false, Tor: false }
  network: ChainType

  readonly explorerNetworks: ExplorerUrlNetwork[] = ['mainnet', 'testnet', 'regtest'];
  explorerUrls: Record<ExplorerUrlCategory, Record<ExplorerUrlNetwork, string>> = {
    blockExplorer: { mainnet: '', testnet: '', regtest: '' },
    tokenDiscovery: { mainnet: '', testnet: '', regtest: '' },
  };
  explorerUrlTesting: { [key: string]: boolean } = {};

  constructor(
    public electron: ElectronService,
    private wallet: WalletService,
    private dgp: DGPService,
    private rpc: RpcService,
    private token: TokenService,
    private http: HttpClient,
    private notification: NotificationService,
  ) { }

  ngOnInit() {
    if (this.electron.settings.proxy) {
      this.proxy.allow = true;
      this.proxy.ip = this.electron.settings.proxy.split(":")[0];
      this.proxy.port = this.electron.settings.proxy.split(":")[1];
    }
    if (this.electron.settings.tor) {
      this.tor.allow = true;
      this.tor.ip = this.electron.settings.tor.split(":")[0];
      this.tor.port = this.electron.settings.tor.split(":")[1];
    }
    if (this.electron.settings.onlynet) {
      let onlyNet = this.electron.settings.onlynet.split(',');
      if (onlyNet.indexOf('ipv4') > -1) this.onlyNet.IPv4 = true;
      if (onlyNet.indexOf('ipv6') > -1) this.onlyNet.IPv6 = true;
      if (onlyNet.indexOf('tor') > -1) this.onlyNet.Tor = true;
    }
    this.network = this.electron.chain

    this.explorerNetworks.forEach(network => {
      this.explorerUrls.blockExplorer[network] = this.electron.settings[EXPLORER_URL_FIELDS.blockExplorer[network].settingKey] || '';
      this.explorerUrls.tokenDiscovery[network] = this.electron.settings[EXPLORER_URL_FIELDS.tokenDiscovery[network].settingKey] || '';
    });
  }

  setHideTray() {
    this.electron.ipcRenderer.send('settings', 'SETHIDETRAY', this.electron.settings.hideTrayIcon);
  }

  setSyncInterval() {
    this.electron.ipcRenderer.send('settings', 'SETSYNCINTERVAL', this.electron.settings.syncInterval);
  }

  setMinimiseToTray() {
    this.electron.ipcRenderer.send('settings', 'SETMINIMISETRAY', this.electron.settings.minimiseToTray);
  }

  setMinimiseOnClose() {
    this.electron.ipcRenderer.send('settings', 'SETMINIMISECLOSE', this.electron.settings.minimiseOnClose);
  }

  setBlockIncoming() {
    this.electron.ipcRenderer.send('settings', 'SETBLOCKINCOMING', this.electron.settings.blockIncomingConnections);
  }

  setProxy() {
    let proxy = '';
    if (this.proxy.allow && this.proxy.ip && this.proxy.port) proxy = this.proxy.ip + ":" + this.proxy.port;
    this.electron.ipcRenderer.send('settings', 'SETPROXY', proxy);
  }

  setTor() {
    let proxy = '';
    if (this.tor.allow && this.tor.ip && this.tor.port) proxy = this.tor.ip + ":" + this.tor.port
    this.electron.ipcRenderer.send('settings', 'SETTOR', proxy);
  }

  setOnlyNet() {
    let net = '';
    if (this.onlyNet.IPv4) net = 'ipv4'
    if (this.onlyNet.IPv6) {
      if (net) net += ",";
      net += 'ipv6'
    }
    if (this.onlyNet.Tor) {
      if (net) net += ",";
      net += 'tor'
    }
    this.electron.ipcRenderer.send('settings', 'SETONLYNET', net);
  }

  setWalletBackupEnabled() {
    this.electron.ipcRenderer.send('settings', 'SETWALLETBACKUPENABLED', this.electron.settings.walletBackupEnabled);
  }

  setWalletBackupLocation() {
    this.electron.ipcRenderer.send('settings', 'SETWALLETBACKUPLOCATION', this.electron.settings.walletBackupLocation);
  }

  async browseWalletBackupLocation() {
    const result = await this.electron.remote.dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths.length) return;
    this.electron.settings.walletBackupLocation = result.filePaths[0];
    this.setWalletBackupLocation();
  }

  resetWalletBackupLocation() {
    this.electron.settings.walletBackupLocation = '';
    this.setWalletBackupLocation();
  }

  setWalletBackupKeepCount() {
    this.electron.ipcRenderer.send('settings', 'SETWALLETBACKUPKEEPCOUNT', Number(this.electron.settings.walletBackupKeepCount));
  }

  setWalletBackupIntervalDays() {
    this.electron.ipcRenderer.send('settings', 'SETWALLETBACKUPINTERVALDAYS', Number(this.electron.settings.walletBackupIntervalDays));
  }

  backupWalletNow() {
    this.electron.backupWalletNow();
  }

  restart() {
    this.wallet.stopSyncService();
    if (this.network !== this.electron.chain) {
      this.wallet.resetState();
      this.dgp.resetState()
      this.token.resetState();
      this.electron.ipcRenderer.send('client-node', 'SETCHAIN', this.network);
    } else {
      this.rpc.restartClient();
    }
  }

  defaultExplorerUrl(category: ExplorerUrlCategory, network: ExplorerUrlNetwork): string {
    const chain = this.chainFor(network);
    return category === 'blockExplorer' ? this.electron.defaultBlockExplorerUrls[chain] : this.electron.defaultTokenDiscoveryUrls[chain];
  }

  isExplorerUrlOverridden(category: ExplorerUrlCategory, network: ExplorerUrlNetwork): boolean {
    return !!this.electron.settings[EXPLORER_URL_FIELDS[category][network].settingKey];
  }

  async saveExplorerUrl(category: ExplorerUrlCategory, network: ExplorerUrlNetwork) {
    const key = `${category}.${network}`;
    if (this.explorerUrlTesting[key]) return;

    const value = (this.explorerUrls[category][network] || '').trim();
    this.explorerUrls[category][network] = value;

    if (value && !this.isValidHttpUrl(value)) {
      this.notification.notify('error', 'NOTIFICATIONS.EXPLORERURLINVALID');
      return;
    }

    if (value) {
      this.explorerUrlTesting[key] = true;
      const reachable = await this.isUrlReachable(value);
      this.explorerUrlTesting[key] = false;
      if (!reachable) {
        this.notification.notify('error', 'NOTIFICATIONS.EXPLORERURLUNREACHABLE');
        return;
      }
    }

    const { settingKey, ipcCmd } = EXPLORER_URL_FIELDS[category][network];
    this.electron.settings[settingKey] = value;
    this.electron.ipcRenderer.send('settings', ipcCmd, value);
    this.notification.notify('success', value ? 'NOTIFICATIONS.EXPLORERURLSAVED' : 'NOTIFICATIONS.EXPLORERURLRESET');
  }

  resetExplorerUrl(category: ExplorerUrlCategory, network: ExplorerUrlNetwork) {
    this.explorerUrls[category][network] = '';
    this.saveExplorerUrl(category, network);
  }

  private chainFor(network: ExplorerUrlNetwork): ChainType {
    if (network === 'mainnet') return ChainType.MAINNET;
    if (network === 'testnet') return ChainType.TESTNET;
    return ChainType.REGTEST;
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (ex) {
      return false;
    }
  }

  // confirms the host actually responds before we save it - any real HTTP response (even
  // an error status like 404/403/500) still means a server answered at that address; only
  // a status of 0 means the request never reached one (bad host, DNS failure, connection
  // refused/timed out). webSecurity is disabled for this app's window, so this isn't
  // subject to CORS the way a normal browser fetch would be.
  private async isUrlReachable(url: string): Promise<boolean> {
    try {
      await this.http.get(url, { responseType: 'text' }).toPromise();
      return true;
    } catch (ex) {
      return ex instanceof HttpErrorResponse && !!ex.status;
    }
  }

}