import 'zone.js/dist/zone-mix';
import 'reflect-metadata';
import '../polyfills';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Routes, RouterModule } from '@angular/router';
// modal
import { NgxSmartModalModule } from 'ngx-smart-modal';
// virtual scroll
import { VirtualScrollerModule } from 'ngx-virtual-scroller';
// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
// icons 
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { setupIcons } from './icon-module';
// alerts
import { NotifierModule } from 'angular-notifier';

// components
import { componentDeclarations, componentProviders } from './app-components.module';
// services
import { ElectronService } from './providers/electron.service';
import { ErrorService } from './providers/error.service';
import { NotificationService } from './providers/notification.service';
import { TranslationService } from './providers/translation.service';
import { DesktopNotificationService } from './providers/desktop-notification.service';
import { CurrencyService } from './providers/currency.service';
// app
import { AppComponent } from './app.component';
import * as metrix from './metrix/metrix.module';
import * as dgp from './dgp/dgp.module';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
// AoT requires the files to be explicitly imported
setupIcons();

// routes
const routes: Routes = [
  { path: '', redirectTo: '/metrix', pathMatch: 'full' },
  metrix.route,
  dgp.route
];

@NgModule({
  declarations: [
    AppComponent,
    ...componentDeclarations,
    ...metrix.declarations,
    ...dgp.declarations
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forRoot(routes, { useHash: true }),
    FontAwesomeModule,
    VirtualScrollerModule,
    NgxSmartModalModule.forRoot(),
    NotifierModule.withConfig({
      position: {
        horizontal: { position: 'right' }
      },
      behaviour: {
        autoHide: 3000,
      }
    }),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (HttpLoaderFactory),
        deps: [HttpClient]
      }
    })
  ],
  providers: [
    ElectronService,
    ErrorService,
    NotificationService,
    TranslationService,
    DesktopNotificationService,
    CurrencyService,
    ...componentProviders,
    ...metrix.providers,
    ...dgp.providers,
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule { }
