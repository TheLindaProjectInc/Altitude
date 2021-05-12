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
        // dismiss notifications
        this.notification.dismissNotifications();
        
        if (ex.error && ex.error.code === "ECONNREFUSED") {
            // ECONNREFUSED denotes a problem connecting to the
            // client this error is handled and notifed to the user in the rpc service
        } else if (ex.error && ex.error.code === "ESOCKETTIMEDOUT") {
            // ESOCKETTIMEDOUT denotes the RPC fails to respond in time
            // this is usually during sync and heavy loads so we can ignore this error
        } else if (ex.code === null && typeof ex.error.message !== "undefined") {
            if (ex.error.message === "ESOCKETTIMEDOUT") {
                // ESOCKETTIMEDOUT denotes the RPC fails to respond in time
                // this is usually during sync and heavy loads so we can ignore this error
            }
        } else if (typeof ex.error.code === "undefined" && typeof ex.error.message !== "undefined") {
            if (ex.name === "HttpErrorResponse" && ex.status == 400) {
                this.notification.notify('error', ex.error.message, false)    
            }
        } else if (ex.rpcCancelled) {
            // ex.rpcCancelled is returned when the RPC calls are cancelled
            // this is usually during a expected or unexpected shutdown of the client
        } else if (ex.body) {
            if (ex.body.error) {
            // an error from the daemon
            const msg = `(${ex.body.error.code}) ${ex.body.error.message.replace('Error:', '').trim()}`;
            this.notification.notify('error', msg, false);
            }
        } else {
            log.error('ErrorService', 'New error', ex);
            this.notification.notify('error', 'NOTIFICATIONS.GENERICERROR');
        }
    }


}