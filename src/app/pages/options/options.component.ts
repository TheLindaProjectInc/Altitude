import { Component } from '@angular/core';
import { ElectronService } from '../../providers/electron.service';

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html'
})
export class OptionsComponent {

  tab = 0;

  constructor(
    private electron: ElectronService,
  ) { }

  setHideTray() {
    this.electron.ipcRenderer.send('settings', 'SETHIDETRAY', this.electron.settings.hideTrayIcon);
  }

  setMinimiseToTray() {
    this.electron.ipcRenderer.send('settings', 'SETMINIMISETRAY', this.electron.settings.minimiseToTray);
  }

  setMinimiseOnClose() {
    this.electron.ipcRenderer.send('settings', 'SETMINIMISECLOSE', this.electron.settings.minimiseOnClose);
  }

}