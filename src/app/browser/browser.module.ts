import { Routes } from '@angular/router';

// components
import { SideBarComponent } from './components/side-bar/side-bar.component';

// pages
import { MasterComponent } from './pages/master/master.component';
import { BrowserComponent } from './pages/browser/browser.component';

// services
import { DappBridgeService } from './providers/dapp-bridge.service';

const routes: Routes = [
    { path: '', component: BrowserComponent },
];

export const route = { path: 'browser', component: MasterComponent, children: routes }

export const providers = [
    DappBridgeService,
]

export const declarations = [
    BrowserComponent,
    SideBarComponent,
    MasterComponent,
]
