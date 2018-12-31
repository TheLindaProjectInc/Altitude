import { Component, isDevMode } from '@angular/core';
import { ElectronService } from './providers/electron.service';
import { AppConfig } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(
    public electron: ElectronService
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

}
