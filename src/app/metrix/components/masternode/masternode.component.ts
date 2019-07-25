import { Component, Input, Output, EventEmitter } from '@angular/core';
import Helpers from 'app/helpers';

@Component({
  selector: 'masternode',
  templateUrl: './masternode.component.html',
  styleUrls: ['./masternode.component.scss']
})
export class MasternodeComponent {

  @Input() mn: any;
  @Input() local: boolean = false;
  @Input() canStart: boolean;
  @Output() start = new EventEmitter();

  public helpers = Helpers;

  constructor(
  ) {
  }

  get running() {
    if (!this.mn) return false;
    if (this.local) {
      switch (this.mn.status) {
        case 0:
        case 2:
        case 3:
        case 4:
        case 6:
        case 7:
        case 8:
          return false;
        case 1:
        case 9:
          return true;
      }
    } else return this.mn.enabled
  }

  get statusText() {
    if (this.mn && this.local) {
      switch (this.mn.status) {
        case 0:
          return "MASTERNODE_NOT_PROCESSED";
        case 1:
          return "MASTERNODE_IS_CAPABLE";
        case 2:
          return "MASTERNODE_NOT_CAPABLE";
        case 3:
          return "MASTERNODE_STOPPED";
        case 4:
          return "MASTERNODE_INPUT_TOO_NEW";
        case 6:
          return "MASTERNODE_PORT_NOT_OPEN";
        case 7:
          return "MASTERNODE_PORT_OPEN";
        case 8:
          return "MASTERNODE_SYNC_IN_PROCESS";
        case 9:
          return "MASTERNODE_REMOTELY_ENABLED";
      }
    }
    return '';
  }
}
