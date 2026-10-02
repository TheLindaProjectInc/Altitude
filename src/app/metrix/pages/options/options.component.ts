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

type DevRpcField = 'host' | 'port' | 'user' | 'password';
type DevRpcNetwork = 'mainnet' | 'testnet' | 'regtest';

// dev RPC override, scoped per network - a value set while running regtest must never
// silently keep applying after switching to testnet/mainnet (see lib/client.ts's
// effectiveRpcConnection, which reads whichever of these matches the active chain)
const DEV_RPC_FIELDS: Record<DevRpcField, Record<DevRpcNetwork, { settingKey: string; ipcCmd: string }>> = {
  host: {
    mainnet: { settingKey: 'devRpcHostMainnet', ipcCmd: 'SETDEVRPCHOSTMAINNET' },
    testnet: { settingKey: 'devRpcHostTestnet', ipcCmd: 'SETDEVRPCHOSTTESTNET' },
    regtest: { settingKey: 'devRpcHostRegtest', ipcCmd: 'SETDEVRPCHOSTREGTEST' },
  },
  port: {
    mainnet: { settingKey: 'devRpcPortMainnet', ipcCmd: 'SETDEVRPCPORTMAINNET' },
    testnet: { settingKey: 'devRpcPortTestnet', ipcCmd: 'SETDEVRPCPORTTESTNET' },
    regtest: { settingKey: 'devRpcPortRegtest', ipcCmd: 'SETDEVRPCPORTREGTEST' },
  },
  user: {
    mainnet: { settingKey: 'devRpcUserMainnet', ipcCmd: 'SETDEVRPCUSERMAINNET' },
    testnet: { settingKey: 'devRpcUserTestnet', ipcCmd: 'SETDEVRPCUSERTESTNET' },
    regtest: { settingKey: 'devRpcUserRegtest', ipcCmd: 'SETDEVRPCUSERREGTEST' },
  },
  password: {
    mainnet: { settingKey: 'devRpcPasswordMainnet', ipcCmd: 'SETDEVRPCPASSWORDMAINNET' },
    testnet: { settingKey: 'devRpcPasswordTestnet', ipcCmd: 'SETDEVRPCPASSWORDTESTNET' },
    regtest: { settingKey: 'devRpcPasswordRegtest', ipcCmd: 'SETDEVRPCPASSWORDREGTEST' },
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

  readonly devRpcNetworks: DevRpcNetwork[] = ['mainnet', 'testnet', 'regtest'];
  devRpc: Record<DevRpcNetwork, { host: string; port: string; user: string; password: string }> = {
    mainnet: { host: '', port: '', user: '', password: '' },
    testnet: { host: '', port: '', user: '', password: '' },
    regtest: { host: '', port: '', user: '', password: '' },
  };

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

    this.devRpcNetworks.forEach(network => {
      this.devRpc[network].host = this.electron.settings[DEV_RPC_FIELDS.host[network].settingKey] || '';
      this.devRpc[network].port = this.electron.settings[DEV_RPC_FIELDS.port[network].settingKey] || '';
      this.devRpc[network].user = this.electron.settings[DEV_RPC_FIELDS.user[network].settingKey] || '';
      this.devRpc[network].password = this.electron.settings[DEV_RPC_FIELDS.password[network].settingKey] || '';
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

  // matches ClientConfigFile.setRPCPort() in lib/settings.ts - shown only as a
  // placeholder hint for what the locally-managed daemon would use on that network
  defaultRpcPort(network: DevRpcNetwork): string {
    if (network === 'mainnet') return '33831';
    if (network === 'testnet') return '33841';
    return '33851';
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

  // dev-only: points the RPC tunnel at a daemon other than the one Altitude spawns
  // locally (e.g. a remote regtest instance already running elsewhere). Scoped per
  // network - an override entered while on regtest must never bleed into testnet/mainnet
  // after switching (e.g. via a different launch shortcut). Read fresh on every RPC call
  // in the main process, so this takes effect on the next poll - no client restart
  // needed, unlike the proxy/tor/onlynet settings above. If the target is reachable,
  // Client.startClient() detects it as already running and never downloads/spawns a
  // local daemon at all.
  setDevRpc(network: DevRpcNetwork) {
    const entry = this.devRpc[network];
    entry.host = (entry.host || '').trim();
    entry.port = (entry.port || '').trim();
    entry.user = (entry.user || '').trim();
    entry.password = (entry.password || '').trim();

    (['host', 'port', 'user', 'password'] as DevRpcField[]).forEach(field => {
      const { settingKey, ipcCmd } = DEV_RPC_FIELDS[field][network];
      this.electron.settings[settingKey] = entry[field];
      this.electron.ipcRenderer.send('settings', ipcCmd, entry[field]);
    });

    const isOverridden = !!(entry.host || entry.port || entry.user || entry.password);
    this.notification.notify('success', isOverridden ? 'NOTIFICATIONS.DEVRPCHOSTSAVED' : 'NOTIFICATIONS.DEVRPCHOSTRESET');
  }

  resetDevRpc(network: DevRpcNetwork) {
    this.devRpc[network] = { host: '', port: '', user: '', password: '' };
    this.setDevRpc(network);
  }

  isDevRpcOverridden(network: DevRpcNetwork): boolean {
    const s = this.electron.settings;
    return !!(s[DEV_RPC_FIELDS.host[network].settingKey] || s[DEV_RPC_FIELDS.port[network].settingKey] || s[DEV_RPC_FIELDS.user[network].settingKey] || s[DEV_RPC_FIELDS.password[network].settingKey]);
  }

  get devRpcOverriddenAnyNetwork(): boolean {
    return this.devRpcNetworks.some(network => this.isDevRpcOverridden(network));
  }

  // gates visibility of the RPC override fields - standard users should never see or set
  // these. Turning the toggle off also clears any override already set on every network,
  // rather than just hiding the fields with a live override still silently applying
  // underneath - a hidden, uneditable landmine would be worse than the field never
  // having existed.
  setDevMode() {
    this.electron.ipcRenderer.send('settings', 'SETDEVMODE', this.electron.settings.devMode);
    if (!this.electron.settings.devMode && this.devRpcOverriddenAnyNetwork) {
      this.devRpcNetworks.forEach(network => this.resetDevRpc(network));
    }
  }

}