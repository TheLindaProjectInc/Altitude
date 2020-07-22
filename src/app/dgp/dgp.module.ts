import { Routes } from '@angular/router';

// components
import { SideBarComponent } from './components/side-bar/side-bar.component';
import { BudgetCardComponent } from './components/budget-card/budget-card.component';

// pages
import { MasterComponent } from './pages/master/master.component';
import { GovernanceComponent } from './pages/governance/governance.component';

// services
import { DGPService } from './providers/dgp.service';
import { BudgetComponent } from './pages/budget/budget.component';
import { BudgetCreateComponent } from './pages/budget-create/budget-create.component';

const routes: Routes = [
    { path: '', component: GovernanceComponent },
    { path: 'budget', component: BudgetComponent },
    { path: 'budget/create', component: BudgetCreateComponent },
];

export const route = { path: 'dgp', component: MasterComponent, children: routes }


export const providers = [
    DGPService,
]

export const declarations = [
    GovernanceComponent,
    BudgetComponent,
    BudgetCreateComponent,
    SideBarComponent,
    MasterComponent,
    BudgetCardComponent
]