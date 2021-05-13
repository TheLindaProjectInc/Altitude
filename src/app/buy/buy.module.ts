import { Routes } from '@angular/router';

// components
import { TitlebarComponent } from './components/titlebar/titlebar.component';
import { SideBarComponent } from './components/side-bar/side-bar.component';

// pages
import { MasterComponent } from './pages/master/master.component';
import { HomeComponent } from './pages/home/home.component';
import { HistoryComponent } from './pages/history/history.component';

// services
import { BuyService } from './providers/buy.service';

const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'history', component: HistoryComponent }
];

export const route = { path: 'buy', component: MasterComponent, children: routes }

export const providers = [
    BuyService,
]

export const declarations = [
    HomeComponent,
    HistoryComponent,
    SideBarComponent,
    MasterComponent,
    TitlebarComponent
]