import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MainChainService } from '../../providers/mainchain.service';

@Component({
  selector: 'metrix-main-chain-check',
  templateUrl: './main-chain-check.component.html',
  styleUrls: ['./main-chain-check.component.scss']
})

export class MainChainCheckComponent {
  constructor(
    public mainchain: MainChainService,
    private router: Router
  ) {
  }

  goToRecovery() {
    this.router.navigate(['/metrix/tools/3']);
  }

}
