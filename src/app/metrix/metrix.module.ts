import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// components
import { PromptComponent } from './components/prompt/prompt.component';
import { PromptService } from './components/prompt/prompt.service';
import { TitlebarComponent } from './components/titlebar/titlebar.component';
import { ClientStatusComponent } from './components/client-status/client-status.component';
import { AddressBookComponent } from './components/address-book/address-book.component';
import { AddressBookService } from './components/address-book/address-book.service';
import { SyncStatusComponent } from './components/sync-status/sync-status.component';
import { SideBarComponent } from './components/side-bar/side-bar.component';
import { TransactionRowComponent } from './components/transaction-row/transaction-row.component';
import { AccountsComponent } from './components/accounts/accounts.component';
import { MarketPriceComponent } from './components/market-price/market-price.component';

// pages
import { SendComponent } from './pages/send/send.component';
import { TransactionsComponent } from './pages/transactions/transactions.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ManageAccountComponent } from './pages/manage-account/manage-account.component';
import { ToolsComponent } from './pages/tools/tools.component';
import { StakingComponent } from './pages/staking/staking.component';
import { SignMessageComponent } from './pages/signmessage/signmessage.component';
import { MasternodesComponent } from './pages/masternodes/masternodes.component';
import { AboutComponent } from '../pages/about/about.component';
import { LocaleComponent } from '../pages/locale/locale.component';
import { ExplorerComponent } from './pages/explorer/explorer.component';
import { OptionsComponent } from './pages/options/options.component';
import { MasterComponent } from './pages/master/master.component';

// services
import { RpcService } from './providers/rpc.service';
import { WalletService } from './providers/wallet.service';

const routes: Routes = [
    { path: '', component: DashboardComponent },
    { path: 'manage-account/:address', component: ManageAccountComponent },
    { path: 'send', component: SendComponent },
    { path: 'staking', component: StakingComponent },
    { path: 'transactions', component: TransactionsComponent },
    { path: 'masternodes', component: MasternodesComponent },
    { path: 'signmessage/:tab', component: SignMessageComponent },
    { path: 'tools/:tab', component: ToolsComponent },
    { path: 'options', component: OptionsComponent },
    { path: 'about/:tab', component: AboutComponent },
    { path: 'locale', component: LocaleComponent },
    { path: 'explorer/:search', component: ExplorerComponent },
];

export const route = { path: 'metrix', component: MasterComponent, children: routes }

export const providers = [
    RpcService,
    WalletService,
    PromptService,
    AddressBookService,
]

export const declarations = [
    SendComponent,
    TransactionsComponent,
    DashboardComponent,
    ManageAccountComponent,
    ToolsComponent,
    StakingComponent,
    SignMessageComponent,
    MasterComponent,
    MasternodesComponent,
    AboutComponent,
    LocaleComponent,
    ExplorerComponent,
    OptionsComponent,
    PromptComponent,
    TitlebarComponent,
    ClientStatusComponent,
    AddressBookComponent,
    SyncStatusComponent,
    SideBarComponent,
    TransactionRowComponent,
    AccountsComponent,
    MarketPriceComponent,
]