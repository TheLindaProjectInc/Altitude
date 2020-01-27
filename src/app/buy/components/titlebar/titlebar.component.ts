import { Component } from '@angular/core';
import { ElectronService } from 'app/providers/electron.service';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { RpcService } from 'app/metrix/providers/rpc.service';
import { TranslationService } from 'app/providers/translation.service';

@Component({
  selector: 'buy-title-bar',
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

  constructor(
    private electron: ElectronService,
    private rpc: RpcService,
    public wallet: WalletService,
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

  getMenus() {
    // we dont have any menus to add for the buy app
    return [];
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
          { role: 'selectAll' }
        ]
      })
      appMenu.insert(1, menuItem);
    }

    this.electron.remote.Menu.setApplicationMenu(appMenu)
  }

  connectMenu() {
    // connect IPC
    this.electron.ipcRenderer.on('MENU.FILE.EXIT', () => this.close());
  }

  documentClick(event) {
    if (event.target.className === "dropbtn") this.menuActive = !this.menuActive;
    else this.menuActive = false;
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
