import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WalletService } from '../../providers/wallet.service';
import { ElectronService } from '../../providers/electron.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html'
})
export class AboutComponent {
  sub;
  tab = 0;

  constructor(
    private route: ActivatedRoute,
    public wallet: WalletService,
    public electron: ElectronService
  ) { }

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
      this.tab = Number(params['tab']);
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

}
