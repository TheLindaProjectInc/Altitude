import { Injectable, isDevMode } from '@angular/core';
import { NotificationService } from './notification.service';
import log from 'electron-log';

@Injectable()
export class ErrorService {

    constructor(
        private notification: NotificationService,
    ) {
    }

    public diagnose(ex: any): void {
        if (isDevMode()) console.log('ErrorService', ex);

        if (ex.statusText && ex.statusText === "Unknown Error") {
            // ex.statusText !== "Unknown Error" denotes a problem connecting to the
            // client this error is handled and notifed to the user in the rpc service
        } else if (ex.error && ex.error.error) {
            const msg = `(${ex.error.error.code}) ${ex.error.error.message.replace('Error:', '').trim()}`;
            this.notification.notify('error', msg, false);
        } else if (ex.rpcNotReady) {
            // ex.rpcNotReady is returned when we try to call the RPC before it's
            // ready we can ignore this error
        } else if (ex.rpcTimeout) {
            // ex.rpcTimeout is returned when the RPC fails to respond in time
            // this is usually during sync and heavy loads so we can ignore this error
        } else {
            log.error('ErrorService', 'New error', ex);
            this.notification.notify('error', 'NOTIFICATIONS.GENERICERROR');
        }
    }


}