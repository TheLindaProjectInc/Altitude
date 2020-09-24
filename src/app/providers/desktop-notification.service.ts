import { Injectable } from '@angular/core';
import { TranslationService } from './translation.service';
import { Transaction } from '../metrix/classes';
import Helpers from '../helpers';

import { CurrencyService } from 'app/providers/currency.service';

@Injectable()
export class DesktopNotificationService {

    constructor(
        private translation: TranslationService,
        public currencyService: CurrencyService
    ) {
    }

    public async notifyNewTransaction(trx: Transaction) {
        // get title
        let title = 'Metrix - ';
        if (trx.category === "Received")
            title += await this.translation.translate('DESKTOPNOTIFICATIONS.NEWTRANSACTION_TITLE_RECEIVED');
        if (trx.category === "Generated" && trx.subCategory === "Minted")
            title += await this.translation.translate('DESKTOPNOTIFICATIONS.NEWTRANSACTION_TITLE_STAKE');

        // get body
        let elapsed = Helpers.friendlyTimeElapsed(trx.timestamp);
        let elapsedBody = '';
        if (elapsed[0]) elapsedBody = `${elapsed[0]} `;
        elapsedBody += await this.translation.translate(elapsed[1]);
        elapsedBody += ' ' + await this.translation.translate('MISC.AGO');
        let body = `${this.currencyService.displayLocal(trx.amount)} (${elapsedBody})`;

        // show
        this.notify(title, body, true, false);
    }

    public async notify(title: string, body: string, translateTitle: boolean = true, translateBody: boolean = true): Promise<void> {
        if (translateTitle) title = await this.translation.translate(title)
        if (translateBody) body = await this.translation.translate(body)
        new Notification(title, { body })
    }


}