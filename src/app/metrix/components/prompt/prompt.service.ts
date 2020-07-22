import { Injectable } from '@angular/core';
import { ElectronService } from 'app/providers/electron.service';
import { NotificationService } from 'app/providers/notification.service';
import { ClientStatus } from 'app/enum';

@Injectable()
export class PromptService {

    public getPassphrase;
    public promptUpdateClient;
    public promptUpdateWallet;
    public changePassphrase;
    public encrypt;
    public alert;
    public addRemoteMasternode;

    constructor(
        private electron: ElectronService,
        private notification: NotificationService,
    ) {
        if (electron.isElectron()) this.setupListeners()
    }

    setupListeners() {
        this.electron.clientStatusEvent.subscribe((status: ClientStatus) => {
            if (status === ClientStatus.UPDATEAVAILABLE) this.notifyUpdateAvailable();
        });
        this.electron.checkUpdateEvent.subscribe((data: any) => {
            if (data.type === 'core') this.notifyCheckCoreUpdateAvailable(data.hasUpdate);
            if (data.type === 'wallet') this.notifyCheckWalletAvailable(data.version, data.showSkip);
        });
    }

    async notifyUpdateAvailable() {
        try {
            await this.promptUpdateClient();
            this.electron.ipcRenderer.send('client-node', 'UPDATE');
        } catch (skip) {
            this.electron.ipcRenderer.send('client-node', 'NOUPDATE', skip);
        }
    }

    async notifyCheckCoreUpdateAvailable(hasUpdate) {
        if (!hasUpdate) return this.notification.notify('default', 'NOTIFICATIONS.NOUPDATE');
        try {
            await this.promptUpdateClient(false);
            this.electron.ipcRenderer.send('client-node', 'APPLYUPDATE');
        } catch (skip) { }
    }

    async notifyCheckWalletAvailable(version: string, showSkip: boolean) {
        try {
            await this.promptUpdateWallet(showSkip);
            this.electron.shell.openExternal('https://github.com/TheLindaProjectInc/Altitude/releases/latest');
        } catch (skip) {
            if (skip) this.electron.ipcRenderer.send('settings', 'SETSKIPWALLETUPDATE', version);
        }
    }

}


