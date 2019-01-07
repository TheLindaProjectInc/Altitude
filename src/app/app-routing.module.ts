import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SendComponent } from './pages/send/send.component';
import { TransactionsComponent } from './pages/transactions/transactions.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ManageAccountComponent } from './pages/manage-account/manage-account.component';
import { ToolsComponent } from './pages/tools/tools.component';
import { StakingComponent } from './pages/staking/staking.component';
import { SignMessageComponent } from './pages/signmessage/signmessage.component';
import { MasternodesComponent } from './pages/masternodes/masternodes.component';
import { AboutComponent } from './pages/about/about.component';
import { LocaleComponent } from './pages/locale/locale.component';
import { ExplorerComponent } from './pages/explorer/explorer.component';
import { OptionsComponent } from './pages/options/options.component';

export const routingDeclarations = [
    SendComponent,
    TransactionsComponent,
    DashboardComponent,
    ManageAccountComponent,
    ToolsComponent,
    StakingComponent,
    SignMessageComponent,
    MasternodesComponent,
    AboutComponent,
    LocaleComponent,
    ExplorerComponent,
    OptionsComponent
]

const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: DashboardComponent },
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

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule]
})
export class AppRoutingModule { }

