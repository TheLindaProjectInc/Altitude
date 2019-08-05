import { Component, isDevMode } from '@angular/core';
import { ElectronService } from './providers/electron.service';
import { AppConfig } from '../environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  constructor(
    public electron: ElectronService,
    private router: Router
  ) {
    if (isDevMode()) {
      console.log('AppConfig', AppConfig);
      if (electron.isElectron()) {
        console.log('Mode electron');
        console.log('Electron ipcRenderer', electron.ipcRenderer);
      } else {
        console.log('Mode web');
      }
    }

  }

  get isFullScreen() {
    if (this.router.url === '/buy') return true;
    return false;
  }

}
