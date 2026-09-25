import { Routes } from '@angular/router';

// components
import { SideBarComponent } from './components/side-bar/side-bar.component';

// pages
import { MasterComponent } from './pages/master/master.component';
import { TokenListComponent } from './pages/token-list/token-list.component';
import { AddTokenComponent } from './pages/add-token/add-token.component';
import { SendTokenComponent } from './pages/send-token/send-token.component';

// services
import { TokenService } from './providers/token.service';
import { TokenContractService } from './providers/token-contract.service';
import { TokenStoreService } from './providers/token-store.service';
import { TokenExplorerService } from './providers/token-explorer.service';

const routes: Routes = [
    { path: '', component: TokenListComponent },
    { path: 'add', component: AddTokenComponent },
    { path: 'send/:contractAddress/:fromAddress', component: SendTokenComponent },
];

export const route = { path: 'token', component: MasterComponent, children: routes }

export const providers = [
    TokenService,
    TokenContractService,
    TokenStoreService,
    TokenExplorerService,
]

export const declarations = [
    TokenListComponent,
    AddTokenComponent,
    SendTokenComponent,
    SideBarComponent,
    MasterComponent,
]
