import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WalletService } from '../../providers/wallet.service';
import Helpers from 'app/helpers';
import { RpcService } from '../../providers/rpc.service';
import { ElectronService, ClientStatus } from 'app/providers/electron.service';

@Component({
  selector: 'app-tools',
  templateUrl: './tools.component.html'
})
export class ToolsComponent implements OnInit {

  @ViewChild('scrollingBlock') private myScrollContainer: ElementRef;
  helpers = Helpers
  sub;
  tab = 0;

  rpcCommand = "";
  rpcHistory = [];
  myCommands = [];
  myCommandIndex = -1;

  peersSub;
  peers = [];

  dateNow: Date;

  repairCommands = ['-salvagewallet', '-rescan', '-zapwallettxes=1', '-zapwallettxes=2', '-upgradewallet', '-reindex'];

  constructor(
    private route: ActivatedRoute,
    private rpc: RpcService,
    public wallet: WalletService,
    public electron: ElectronService,
    private cdRef: ChangeDetectorRef
  ) { }

  ngAfterViewChecked() {
    this.dateNow = new Date();
    this.cdRef.detectChanges();
  }

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
      this.tab = Number(params['tab']);
    });
    this.peers = this.wallet.peers;
    this.peersSub = this.wallet.transactionsUpdated.subscribe(() => {
      this.peers = this.wallet.peers;
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.peersSub.unsubscribe();
  }

  rpcKeyUp(e) {
    if (this.myCommandIndex < this.myCommands.length) this.myCommandIndex++;
    this.rpcCommand = this.myCommands[this.myCommandIndex];
  }

  rpcKeyDown(e) {
    if (this.myCommandIndex > -1) this.myCommandIndex--;
    this.rpcCommand = this.myCommands[this.myCommandIndex];
  }

  async sendRPC() {
    if (this.rpcCommand) {
      try {
        this.rpcHistory.push({ ts: new Date(), send: true, data: this.rpcCommand, json: false });
        this.myCommands.splice(0, 0, this.rpcCommand);
        let params = this.rpcCommand.split(" ");
        const method = params.shift();
        params = this.parseRPCParams(params);
        const res: any = await this.rpc.callServer(method, params);
        let isJson = false;
        if (res.result) isJson = typeof (res.result) === 'object';
        this.rpcHistory.push({ ts: new Date(), send: false, data: res.result || res.error, json: isJson });
      } catch (ex) {
        let err = 'Error';
        if (ex.error) err = ex.error;
        if (ex.body.error) err = `${ex.body.error.message} (code ${ex.body.error.code})`;
        this.rpcHistory.push({ ts: new Date(), send: false, data: err, json: false });
      }
      this.rpcCommand = "";
      // scroll to bottom of output once it has rendered
      setTimeout(() => {
        this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
      }, 50);
    }
  }

  parseRPCParams(params: Array<any>) {
    let parsedParams = [];
    params.forEach(param => {
      if (param.toString().toLowerCase() === 'true') parsedParams.push(true)
      else if (param.toString().toLowerCase() === 'false') parsedParams.push(false)
      else if (!isNaN(Number(param))) parsedParams.push(Number(param));
      else {
        try {
          parsedParams.push(JSON.parse(param.replace(/'/g, "")))
        } catch (ex) {
          parsedParams.push(param);
        }
      }
    })
    return parsedParams;
  }

  clearRPCHistory() {
    this.rpcHistory = [];
  }

  getPeersSpread() {
    let inbound = 0;
    let outbound = 0;
    this.wallet.peers.forEach(peer => {
      if (peer.inbound) inbound++;
      else outbound++;
    })
    return [inbound, outbound];
  }

  prettyDataTransfer(amount) {
    // check bytes
    if (amount < 1000) return amount + ' B';
    // check kb
    amount = Math.round(amount / 1000);
    if (amount < 1000) return amount + ' KB';
    // check mb
    amount = Math.round(amount / 1000);
    if (amount < 1000) return amount + ' MB';
    // check gb
    amount = Math.round(amount / 1000);
    if (amount < 1000) return amount + ' GB';
  }

  prettyPing(amount) {
    return Math.round(amount * 1000) + 'ms';
  }

  canRunRepair() {
    return this.rpc.clientStatus !== ClientStatus.RUNNINGEXTERNAL;
  }

  repairWallet(cmd) {
    this.rpc.restartClient([this.repairCommands[cmd]]);
  }

}