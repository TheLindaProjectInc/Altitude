import { Component } from '@angular/core';
import { RpcService } from '../../providers/rpc.service';
import { ElectronService } from 'app/providers/electron.service';
import { ClientStatus } from 'app/enum';
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
