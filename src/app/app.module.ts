import 'zone.js/mix';
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
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { setupIcons } from './icon-module';
// alerts
import { NotifierModule } from 'angular-notifier2';

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
// Disable Buy Metrix
// import * as buy from './buy/buy.module';
import * as dgp from './dgp/dgp.module';
// pipes
import { PrettyCoinsPipe } from './pipes/pretty-coins.pipe';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// routes
const routes: Routes = [
  { path: '', redirectTo: '/metrix', pathMatch: 'full' },
  metrix.route,
  // Disable Buy Metrix
  // buy.route,
  dgp.route
];

@NgModule({
  declarations: [
    AppComponent,
    PrettyCoinsPipe,
    ...componentDeclarations,
    ...metrix.declarations,
    ...dgp.declarations
    // Disable Buy Metrix
    //...buy.declarations
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forRoot(routes, { useHash: true, relativeLinkResolution: 'legacy' }),
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
    ...dgp.providers
    // Disable Buy Metrix
    //...buy.providers
  ],
  bootstrap: [
    AppComponent
  ]
})

export class AppModule {
  constructor(library: FaIconLibrary) {
    setupIcons(library);
  }
}
