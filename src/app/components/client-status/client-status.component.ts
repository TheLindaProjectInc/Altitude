import { Component } from '@angular/core';
import { RpcService } from '../../providers/rpc.service';
import { ClientStatus } from '../../providers/electron.service';

@Component({
  selector: 'client-status',
  templateUrl: './client-status.component.html'
})
export class ClientStatusComponent {

  constructor(
    public rpc: RpcService,
  ) {

  }

  showStatusIndicator() {
    return !this.rpc.RPCReady || (this.rpc.clientStatus !== ClientStatus.RUNNING && this.rpc.clientStatus !== ClientStatus.RUNNINGEXTERNAL)
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
    }
    return translation
  }


}
