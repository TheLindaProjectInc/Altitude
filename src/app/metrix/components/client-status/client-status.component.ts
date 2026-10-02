import { Component } from '@angular/core';
import { RpcService } from '../../providers/rpc.service';
import { ElectronService } from 'app/providers/electron.service';
import { ClientStatus, ChainType } from 'app/enum';
import Helpers from 'app/helpers';

@Component({
    selector: 'client-status',
    templateUrl: './client-status.component.html',
    styleUrls: ['./client-status.component.scss'],
    standalone: false
})
export class ClientStatusComponent {

  public helpers = Helpers;
  public ClientStatus = ClientStatus;

  constructor(
    public rpc: RpcService,
    public electron: ElectronService,
  ) {

  }

  showStatusIndicator() {
    return !this.rpc.recoveryMode && (!this.rpc.RPCReady || (this.rpc.clientStatus !== ClientStatus.RUNNING && this.rpc.clientStatus !== ClientStatus.RUNNINGEXTERNAL))
  }

  // this backdrop blocks the entire app - including navigation to Options - for as long
  // as RPC isn't ready, so a bad dev RPC override (Options > Developer) would otherwise
  // have no way back in. Surface a direct escape hatch right here instead - but only when
  // it's actually plausibly the override's fault: RUNNING/RUNNINGEXTERNAL means we think
  // we're talking to a live daemon and RPC still isn't confirmed ready, which is exactly
  // what a bad override looks like. Deliberately NOT gated on the Developer Mode toggle -
  // someone stuck with a leftover override (e.g. from before that toggle existed, or set
  // while dev mode was on and never cleared) must always have a way back in regardless of
  // whatever the toggle is currently set to.
  //
  // Scoped to whichever chain is actually active (electron.chain), matching the same
  // per-chain override lib/client.ts's effectiveRpcConnection applies - an override left
  // on a different, currently-inactive chain is not what's causing this and shouldn't be
  // offered (or silently cleared) here.
  private get chainSuffix(): 'Mainnet' | 'Testnet' | 'Regtest' {
    if (this.electron.chain === ChainType.TESTNET) return 'Testnet';
    if (this.electron.chain === ChainType.REGTEST) return 'Regtest';
    return 'Mainnet';
  }

  showDevRpcOverrideNotice(): boolean {
    const s = this.electron.settings;
    const suffix = this.chainSuffix;
    const hasOverride = !!(s[`devRpcHost${suffix}`] || s[`devRpcPort${suffix}`] || s[`devRpcUser${suffix}`] || s[`devRpcPassword${suffix}`]);
    const plausiblyStuck = this.rpc.clientStatus === ClientStatus.RUNNING || this.rpc.clientStatus === ClientStatus.RUNNINGEXTERNAL;
    return hasOverride && plausiblyStuck;
  }

  clearDevRpcOverride() {
    const suffix = this.chainSuffix;
    ['devRpcHost', 'devRpcPort', 'devRpcUser', 'devRpcPassword'].forEach(field => {
      this.electron.settings[`${field}${suffix}`] = '';
      this.electron.ipcRenderer.send('settings', `SET${field.toUpperCase()}${suffix.toUpperCase()}`, '');
    });
    this.rpc.restartClient();
  }

  getRPCStatus() {
    let translation = 'CLIENTSTATUS.INITIALISING';
    switch (this.rpc.clientStatus) {
      case ClientStatus.DOWNLOADCLIENT:
        translation = 'CLIENTSTATUS.DOWNLOADCLIENT';
        break;
      case ClientStatus.UPDATEAVAILABLE:
        translation = 'CLIENTSTATUS.UPDATEAVAILABLE';
        break;
      case ClientStatus.SHUTTINGDOWN:
        translation = 'CLIENTSTATUS.SHUTTINGDOWN';
        break;
      case ClientStatus.RESTARTING:
        translation = 'CLIENTSTATUS.RESTARTING';
        break;
      case ClientStatus.BOOTSTRAPPING:
        translation = 'CLIENTSTATUS.BOOTSTRAPPING';
        break;
      case ClientStatus.BOOTSTRAPEXTRACTING:
        translation = 'CLIENTSTATUS.BOOTSTRAPEXTRACTING';
        break;
    }
    return translation
  }


  downloadProgress(downloadProgress){
    return parseFloat(downloadProgress).toFixed(2);
  }

  extractProgress(extractProgress) {
    return parseFloat(extractProgress).toFixed(2);
  }

  round(n) {
    return Math.round(n || 0);
  }

}
