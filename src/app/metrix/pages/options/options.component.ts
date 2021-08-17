import { Component, OnInit } from '@angular/core';
import { ElectronService } from 'app/providers/electron.service';
import { ChainType } from 'app/enum';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { RpcService } from 'app/metrix/providers/rpc.service';
import { DGPService } from 'app/dgp/providers/dgp.service';

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html'
})
export class OptionsComponent implements OnInit {

  tab = 0;

  proxy = { allow: false, ip: '', port: '' }
  tor = { allow: false, ip: '', port: '' }
  onlyNet = { IPv4: false, IPv6: false, Tor: false }
  network: ChainType
  
  constructor(
    public electron: ElectronService,
    private wallet: WalletService,
    private dgp: DGPService,
    private rpc: RpcService
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

  restart() {
    this.wallet.stopSyncService();
    if (this.network !== this.electron.chain) {
      this.wallet.resetState();
      this.dgp.resetState()
      this.electron.ipcRenderer.send('client-node', 'SETCHAIN', this.network);
    } else {
      this.rpc.restartClient();
    }
  }

}