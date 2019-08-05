import { Routes } from '@angular/router';

// components

// pages
import { HomeComponent } from './pages/home/home.component';

// services
import { BuyService } from './providers/buy.service';
import { TitlebarComponent } from './components/titlebar/titlebar.component';

const routes: Routes = [
    { path: '', component: HomeComponent },
];

export const route = { path: 'buy', children: routes }

export const providers = [
    BuyService,
]

export const declarations = [
    HomeComponent,
    TitlebarComponent
]