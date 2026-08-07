import { Injectable, isDevMode, EventEmitter, Output, Directive } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer, clipboard, shell } from 'electron';
import * as remote from '@electron/remote'
import { CurrencyService } from './currency.service';
import { ChainType, ClientStatus } from 'app/enum';
import Languages from 'app/languages';
@Directive()
@Injectable()
export class ElectronService {

  ipcRenderer: typeof ipcRenderer;
  remote: typeof remote;
  clipboard: typeof clipboard;
  shell: typeof shell;

  settings: any = {};
  clientVersion: string = '0';
  chain: ChainType = ChainType.MAINNET;
  publicIP: string = '';
  downloadProgress: any = {};

  @Output() clientStatusEvent: EventEmitter<ClientStatus> = new EventEmitter();
  @Output() RCPStatusEvent: EventEmitter<any> = new EventEmitter();
  @Output() checkUpdateEvent: EventEmitter<any> = new EventEmitter();
  @Output() languageChangedEvent: EventEmitter<any> = new EventEmitter();
  @Output() RPCResponseEvent: EventEmitter<any> = new EventEmitter();

  constructor(
    private translate: TranslateService,
    private currencyService: CurrencyService,
  ) {
    // Conditional imports
    if (this.isElectron()) {

      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.clipboard = window.require('electron').clipboard;
      this.shell = window.require('electron').shell;

      this.remote = window.require('@electron/remote');

      this.getDeviceLangauge();
      this.connectClientNodeIPC();
      this.connectSettingsIPC();
      this.connectAppUpdateIPC();

      if (!isDevMode())
        this.checkForWalletUpdate().then(() => { }, err => { });
    }
  }

  isElectron = () => {
    return window && window.process && window.process.type;
  }

  connectClientNodeIPC() {
    // listen for client
    this.ipcRenderer.on('client-node', (event, cmd, data) => {
      //if (isDevMode()) console.log('Received IPC:client-node', cmd, data);
      switch (cmd) {
        case 'DOWNLOADPROGRESS':
          this.downloadProgress = data;
          break;
        case 'STATUS':
          this.clientStatusEvent.emit(data);
          break;
        case 'RPC':
          this.RCPStatusEvent.emit(data);
          break;
        case 'CHECKUPDATE':
          this.checkUpdateEvent.emit({ type: 'core', hasUpdate: data });
          break;
        case 'CALLCLIENT':
          this.RPCResponseEvent.emit(data);
          break;
        case 'VERSION':
          this.clientVersion = data;
          break;
        case 'CHAIN':
          this.chain = data;
          break;
        case 'IP':
          this.publicIP = data;
          break;
      }
    });
    // ask for client status
    this.ipcRenderer.send('client-node', 'STATUS');
    // ask for rpc status
    this.ipcRenderer.send('client-node', 'RPC');
    // ask for client version
    this.ipcRenderer.send('client-node', 'VERSION');
    // ask for client chain
    this.ipcRenderer.send('client-node', 'CHAIN');
    // ask for ip address
    this.ipcRenderer.send('client-node', 'IP');
  }

  connectSettingsIPC() {
    // listen for client
    this.ipcRenderer.on('settings', (event, cmd, data) => {
      if (isDevMode()) console.log('Received IPC:settings', cmd, data);
      switch (cmd) {
        case 'GET':
          this.settings = data;
          this.setLanguage();
          this.setDisplayCurrency();
          break;
      }
    });
    // ask for settings
    this.ipcRenderer.send('settings', 'GET');
  }

  getDeviceLangauge() {
    this.translate.use('en');
    const localLanguage = navigator.language.toLowerCase();
    const localLangaugeSplit = localLanguage.split("-")[0];
    Languages.supported.forEach(language => {
      const supportedLanguage = Languages.getCode(language).toLowerCase();
      if (supportedLanguage === localLanguage || supportedLanguage === localLangaugeSplit) {
        if (isDevMode()) console.log("Detected local language", language);
        this.translate.use(Languages.getCode(language));
      }
    });
  }

  setLanguage() {
    if (this.settings.locale && this.translate.getCurrentLang() !== this.settings.locale) {
      if (isDevMode()) console.log("Setting language to", this.settings.locale)
      this.translate.use(this.settings.locale);
      this.languageChangedEvent.emit();
    }
  }

  setDisplayCurrency() {
    if (this.settings.currency && this.currencyService.currency !== this.settings.currency) {
      if (isDevMode()) console.log("Setting display currency to", this.settings.currency)
      this.currencyService.changeCurrency(this.settings.currency);
    }
  }

  connectAppUpdateIPC() {
    // listen for updater events that aren't tied to a specific check request
    this.ipcRenderer.on('app-update', (event, cmd, data) => {
      switch (cmd) {
        case 'PROGRESS':
          this.checkUpdateEvent.emit({ type: 'wallet-progress', progress: data });
          break;
        case 'DOWNLOADED':
          this.checkUpdateEvent.emit({ type: 'wallet-downloaded', version: data.version });
          break;
        case 'DOWNLOADERROR':
          this.checkUpdateEvent.emit({ type: 'wallet-error' });
          break;
      }
    });
  }

  public checkForWalletUpdate(showSkip = true) {
    return new Promise((resolve, reject) => {
      const handler = (event, cmd, data) => {
        if (cmd === 'AVAILABLE') {
          this.ipcRenderer.removeListener('app-update', handler);
          this.checkUpdateEvent.emit({ type: 'wallet', version: data.version, showSkip: data.showSkip });
          resolve(true);
        } else if (cmd === 'NOTAVAILABLE') {
          this.ipcRenderer.removeListener('app-update', handler);
          resolve(false);
        } else if (cmd === 'ERROR') {
          this.ipcRenderer.removeListener('app-update', handler);
          reject(new Error('Failed to check for update'));
        }
      };
      this.ipcRenderer.on('app-update', handler);
      this.ipcRenderer.send('app-update', 'CHECK', showSkip);
    })
  }

  public downloadWalletUpdate() {
    this.ipcRenderer.send('app-update', 'DOWNLOAD');
  }

  public installWalletUpdate() {
    this.ipcRenderer.send('app-update', 'INSTALL');
  }
}