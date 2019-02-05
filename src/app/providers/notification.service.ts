import { Injectable } from '@angular/core';
import { NotifierService } from 'angular-notifier';
import { TranslationService } from './translation.service';

@Injectable()
export class NotificationService {

    dismissableNotificationList = [];

    constructor(
        private notifier: NotifierService,
        private translation: TranslationService
    ) {
    }

    public async notify(type: string, translation: string, translate: boolean = true): Promise<void> {
        this.dismissNotifications();
        this.notifier.notify(type, translate ? await this.translation.translate(translation) : translation);
    }

    public dismissNotifications() {
        this.dismissableNotificationList.forEach(id => {
            this.notifier.hide(id);
        })
        this.dismissableNotificationList = [];
    }

    public async loading(translation: string, translate: boolean = true): Promise<void> {

        const id = new Date().getTime().toString();
        this.dismissableNotificationList.push(id);

        setTimeout(async () => {
            if (this.dismissableNotificationList.indexOf(id) > -1) {
                this.notifier.notify('default', translate ? await this.translation.translate(translation) : translation, id);
            }
        }, 500);
    }

}