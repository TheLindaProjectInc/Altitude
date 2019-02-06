import { Component, isDevMode } from '@angular/core';
import { WalletService, DATASYNCTYPES } from '../../providers/wallet.service';
import { Router } from '@angular/router';
import { PromptService } from '../prompt/prompt.service';
import { ElectronService } from '../../providers/electron.service';
import { ErrorService } from '../../providers/error.service';
import { RpcService } from '../../providers/rpc.service';
import { NotificationService } from '../../providers/notification.service';
import { TranslationService } from '../../providers/translation.service';
import { EncryptionStatus } from '../../classes';

@Component({
  selector: 'title-bar',
  templateUrl: './titlebar.component.html',
  host: {
    '(document:click)': 'documentClick($event)',
  },
})
export class TitlebarComponent {

  menuActive = false;
  menuHoverIndex = -1
  appWindow = this.electron.remote.getCurrentWindow();
  showWindowsMenu: boolean = false;
  subEncryption;
  subLanguage;
  public EncryptionStatus = EncryptionStatus;

  constructor(
    private prompt: PromptService,
    private electron: ElectronService,
    private rpc: RpcService,
    public wallet: WalletService,
    private router: Router,
    private notification: NotificationService,
    private errorService: ErrorService,
    private translation: TranslationService
  ) {

  }

  ngOnInit() {
    if (this.electron.isElectron()) {
      // if we are on windows use our angular menu
      // otherwise build the menu natively and link
      // actions through IPC
      this.showWindowsMenu = window.process.platform === 'win32';
      if (!this.showWindowsMenu) {
        this.connectMenu();
        this.buildMenu();
      }
    }
  }

  ngOnDestroy() {
    if (this.subEncryption) this.subEncryption.unsubscribe();
    if (this.subLanguage) this.subLanguage.unsubscribe();
  }

  getMenus() {
    let encryptionItems = [];
    if (this.wallet.walletStatus.encryption_status === EncryptionStatus.UNENCRYPTED)
      encryptionItems.push('MENU.ENCRYPT.ENCRYPT')
    if (this.wallet.walletStatus.encryption_status !== EncryptionStatus.UNENCRYPTED)
      encryptionItems.push('MENU.ENCRYPT.CHANGEPASS')
    if (this.wallet.canUnlock())
      encryptionItems.push('MENU.ENCRYPT.UNLOCK')
    if (this.wallet.canLock())
      encryptionItems.push('MENU.ENCRYPT.LOCK')

    const menus = [
      {
        label: 'MENU.FILE.TITLE',
        items: [
          'MENU.FILE.BACKUPWALLET',
          'MENU.FILE.SIGNMESSAGE',
          'MENU.FILE.VERIFYMESSAGE',
          'SEPERATOR',
          'MENU.FILE.OPTIONS',
          'MENU.FILE.LOCALE',
          'SEPERATOR',
          'MENU.FILE.RESTARTCORE',
          'SEPERATOR',
          'MENU.FILE.EXIT',
        ]
      },
      {
        label: 'MENU.ENCRYPT.TITLE',
        items: encryptionItems
      },
      {
        label: 'MENU.TOOLS.TITLE',
        items: [
          'MENU.TOOLS.INFORMATION',
          'MENU.TOOLS.DEBUGCONSOLE',
          'MENU.TOOLS.PEERSLIST',
          'MENU.TOOLS.WALLETREPAIR',
        ]
      },
      {
        label: 'MENU.HELP.TITLE',
        items: [
          'MENU.HELP.CHECKUPDATECORE',
          'MENU.HELP.CHECKUPDATEWALLET',
          'SEPERATOR',
          'MENU.HELP.ISSUE',
          'MENU.HELP.DISCORD',
          'SEPERATOR',
          'MENU.HELP.ABOUTCORE',
          'MENU.HELP.ABOUTALTITUDE'
        ]
      },
    ];

    return menus;
  }

  get isMaximized() {
    if (this.appWindow.isMaximized()) return false;
    return true;
  }

  async buildMenu() {
    let appMenu = new this.electron.remote.Menu();

    const menus = this.getMenus();

    for (let i = 0; i < menus.length; i++) {
      let menu = menus[i];
      // create submenu
      let submenu = [];
      for (let j = 0; j < menu.items.length; j++) {
        const item = menu.items[j];
        if (item === 'SEPERATOR') submenu.push({ type: 'separator' })
        else submenu.push({
          label: await this.translation.translate(item),
          click(menuItem, currentWindow) { currentWindow.webContents.send(item) }
        })
      }
      // create menu item
      const label = await this.translation.translate(menu.label)
      const menuItem = new this.electron.remote.MenuItem({
        label: label,
        role: 'window',
        submenu: submenu
      })
      appMenu.append(menuItem);
    }

    // OSX needs the edit menu for keyboard shortcuts to work
    if (window.process.platform === 'darwin') {
      const menuItem = new this.electron.remote.MenuItem({
        label: 'Edit',
        submenu: [
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'delete' },
          { role: 'selectall' }
        ]
      })
      appMenu.insert(1, menuItem);
    }

    this.electron.remote.Menu.setApplicationMenu(appMenu)
  }

  connectMenu() {
    // listen for encryption and language changes to redraw
    this.subEncryption = this.wallet.encryptionStatusChanges.subscribe(() => {
      this.buildMenu();
    });
    this.subLanguage = this.electron.languageChangedEvent.subscribe(() => {
      this.buildMenu();
    });
    // connect IPC
    this.electron.ipcRenderer.on('MENU.FILE.BACKUPWALLET', () => this.backupWallet());
    this.electron.ipcRenderer.on('MENU.FILE.SIGNMESSAGE', () => this.goToSignMessage());
    this.electron.ipcRenderer.on('MENU.FILE.VERIFYMESSAGE', () => this.goToVerifyMessage());
    this.electron.ipcRenderer.on('MENU.FILE.OPTIONS', () => this.goToOptions());
    this.electron.ipcRenderer.on('MENU.FILE.LOCALE', () => this.goToLocale());
    this.electron.ipcRenderer.on('MENU.FILE.RESTARTCORE', () => this.restartCore());
    this.electron.ipcRenderer.on('MENU.FILE.EXIT', () => this.close());

    this.electron.ipcRenderer.on('MENU.ENCRYPT.ENCRYPT', () => this.encryptWallet());
    this.electron.ipcRenderer.on('MENU.ENCRYPT.CHANGEPASS', () => this.changePassphrase());
    this.electron.ipcRenderer.on('MENU.ENCRYPT.UNLOCK', () => this.unlockWallet());
    this.electron.ipcRenderer.on('MENU.ENCRYPT.LOCK', () => this.lockWallet());

    this.electron.ipcRenderer.on('MENU.TOOLS.INFORMATION', () => this.goToInformation());
    this.electron.ipcRenderer.on('MENU.TOOLS.DEBUGCONSOLE', () => this.goToDebugConsole());
    this.electron.ipcRenderer.on('MENU.TOOLS.PEERSLIST', () => this.goToPeersList());
    this.electron.ipcRenderer.on('MENU.TOOLS.WALLETREPAIR', () => this.goToWalletRepair());

    this.electron.ipcRenderer.on('MENU.HELP.CHECKUPDATECORE', () => this.checkUpdateCore());
    this.electron.ipcRenderer.on('MENU.HELP.CHECKUPDATEWALLET', () => this.checkUpdateWallet());
    this.electron.ipcRenderer.on('MENU.HELP.ABOUTCORE', () => this.goToAboutCore());
    this.electron.ipcRenderer.on('MENU.HELP.ABOUTALTITUDE', () => this.goToAboutAltitude());
    this.electron.ipcRenderer.on('MENU.HELP.DISCORD', () => this.openDiscord());
    this.electron.ipcRenderer.on('MENU.HELP.ISSUE', () => this.openIssues());
  }

  documentClick(event) {
    if (event.target.className === "dropbtn") this.menuActive = !this.menuActive;
    else this.menuActive = false;
  }

  async backupWallet() {
    const options = {
      filters: [
        { name: 'Wallet Data', extensions: ['dat'] }
      ]
    }
    this.electron.remote.dialog.showSaveDialog(options, async (filename, bookmark) => {
      if (filename) {
        this.notification.loading('NOTIFICATIONS.WALLETBACKINGUP');
        try {
          await this.wallet.backupWallet(filename);
          this.notification.notify('success', 'NOTIFICATIONS.WALLETBACKEDUP');
        } catch (ex) {
          this.notification.dismissNotifications();
          this.errorService.diagnose(ex);
        }
      }
    });
  }

  goToSignMessage() {
    this.router.navigate(['/signmessage/0']);
  }

  goToVerifyMessage() {
    this.router.navigate(['/signmessage/1']);
  }

  goToOptions() {
    this.router.navigate(['/options']);
  }

  goToLocale() {
    this.router.navigate(['/locale']);
  }

  async encryptWallet() {
    try {
      const [nPass, confPass] = await this.prompt.encrypt();
      if (!nPass || !confPass) return this.notification.notify('error', 'NOTIFICATIONS.EMPTYFIELDS');
      if (nPass !== confPass) return this.notification.notify('error', 'NOTIFICATIONS.PASSPHRASEMISMATCH');

      this.notification.loading('NOTIFICATIONS.WALLETENCRYPTING');

      try {
        await this.wallet.encryptWallet(nPass);
        this.prompt.alert('COMPONENTS.PROMPT.ENCRYPTEDTITLE', 'COMPONENTS.PROMPT.ENCRYPTEDCONTENT', 'MISC.OKBUTTON');
        this.rpc.restartClient();
      } catch (ex) {
        this.errorService.diagnose(ex);
      }
      this.notification.dismissNotifications()

    } catch (ex) {
      // closed prompt
    }
  }

  async unlockWallet() {
    try {
      const [passphrase, stakingOnly] = await this.prompt.getPassphrase(true);

      try {
        await this.wallet.unlock(passphrase, stakingOnly);
        this.wallet.requestDataSync(DATASYNCTYPES.WALLET)
      } catch (ex) {
        this.errorService.diagnose(ex);
      }

    } catch (ex) {
      // closed prompt
    }
  }

  lockWallet() {
    this.wallet.lockWallet();
  }

  async changePassphrase() {
    try {
      const [cPass, nPass, confPass] = await this.prompt.changePassphrase();
      if (!nPass || !cPass || !confPass) return this.notification.notify('error', 'NOTIFICATIONS.EMPTYFIELDS');
      if (nPass !== confPass) return this.notification.notify('error', 'NOTIFICATIONS.PASSPHRASEMISMATCH');

      this.notification.loading('NOTIFICATIONS.CHANGINGPASSPHARASE');
      try {
        await this.wallet.changePassphrase(cPass, nPass);
        this.prompt.alert('COMPONENTS.PROMPT.ENCRYPTEDTITLE', 'COMPONENTS.PROMPT.ENCRYPTEDCONTENT', 'MISC.OKBUTTON');
      } catch (ex) {
        this.errorService.diagnose(ex);
      }
      this.notification.dismissNotifications()

    } catch (ex) {
      // closed prompt
    }
  }

  goToInformation() {
    this.router.navigate(['/tools/0']);
  }

  goToDebugConsole() {
    this.router.navigate(['/tools/1']);
  }

  goToPeersList() {
    this.router.navigate(['/tools/2']);
  }

  goToWalletRepair() {
    this.router.navigate(['/tools/3']);
  }

  goToAboutCore() {
    this.router.navigate(['/about/0']);
  }

  goToAboutAltitude() {
    this.router.navigate(['/about/1']);
  }

  openDiscord() {
    this.electron.shell.openExternal('https://discord.gg/SHNjQBv');
  }

  openIssues() {
    this.electron.shell.openExternal('https://github.com/TheLindaProjectInc/Altitude/issues');
  }

  checkUpdateCore() {
    this.notification.notify('default', 'NOTIFICATIONS.CHECKINGUPDATE');
    this.electron.ipcRenderer.send('client-node', 'CHECKUPDATE');
  }

  async checkUpdateWallet() {
    this.notification.loading('NOTIFICATIONS.CHECKINGUPDATE');
    try {
      let hasUpdate = await this.electron.checkForWalletUpdate(false);
      if (!hasUpdate) return this.notification.notify('default', 'NOTIFICATIONS.NOUPDATE');
    } catch (ex) {
      this.notification.notify('error', 'NOTIFICATIONS.CHECKINGUPDATEFAILED');
    }
    this.notification.dismissNotifications()
  }

  restartCore() {
    this.wallet.stopSyncService();
    this.rpc.restartClient();
  }

  minimize() {
    if (this.electron.settings.minimiseToTray) {
      // minimise to tray
      this.electron.ipcRenderer.send('window', 'HIDE');
    } else {
      // minimise to taskbar
      this.appWindow.minimize();
    }
  }

  resize() {
    if (this.appWindow.isMaximized()) {
      this.appWindow.unmaximize();
      this.appWindow.setSize(800, 600);
      this.electron.ipcRenderer.send('settings', 'SETFULLSCREEN', false);
    } else {
      this.appWindow.maximize();
      this.electron.ipcRenderer.send('settings', 'SETFULLSCREEN', true);
    }
  }

  close() {
    if (this.electron.settings.minimiseOnClose) {
      // minimise
      this.minimize();
    } else {
      // close
      this.wallet.stopSyncService();
      this.rpc.stopClient()
      this.electron.remote.app.quit()
    }
  }

}
