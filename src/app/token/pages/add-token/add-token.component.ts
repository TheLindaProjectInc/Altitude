import { Component, OnDestroy, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { TokenService } from 'app/token/providers/token.service';
import { Token } from 'app/token/classes/token';
import { NotificationService } from 'app/providers/notification.service';
import { ErrorService } from 'app/providers/error.service';

@Component({
    templateUrl: './add-token.component.html',
    styleUrls: ['./add-token.component.scss'],
    standalone: false
})
export class AddTokenComponent implements OnDestroy {

    contractAddress = '';
    preview: Token = null;
    probing = false;
    probed = false;
    adding = false;

    private probeTimeout: any;

    constructor(
        private token: TokenService,
        private router: Router,
        private notification: NotificationService,
        private errorService: ErrorService,
    ) { }

    ngOnDestroy() {
        if (this.probeTimeout) clearTimeout(this.probeTimeout);
    }

    // fires on every keystroke ((change) on the underlying <input> only fires on blur,
    // which meant typing an address and going straight to the Add button - without
    // clicking elsewhere first - never triggered a lookup, silently leaving the Add
    // button disabled with no feedback as to why
    onAddressInput() {
        this.preview = null;
        this.probed = false;
        if (this.probeTimeout) clearTimeout(this.probeTimeout);
        this.probeTimeout = setTimeout(() => this.probe(), 500);
    }

    async probe() {
        if (this.probeTimeout) clearTimeout(this.probeTimeout);
        const address = (this.contractAddress || '').trim().replace(/^0x/, '');
        this.preview = null;
        this.probed = false;
        if (!/^[0-9a-fA-F]{40}$/.test(address)) return;
        this.probing = true;
        try {
            this.preview = await this.token.probeContract(address);
        } catch (ex) {
            if (isDevMode()) console.log(ex);
            this.errorService.diagnose(ex);
        }
        this.probing = false;
        this.probed = true;
    }

    async confirmAdd() {
        if (!this.preview || this.adding) return;
        this.adding = true;
        try {
            const added = await this.token.addTokenManually(this.contractAddress.trim());
            if (!added) {
                // classification succeeded during probe() but failed again here (e.g. the
                // daemon connection dropped in between) - don't report false success
                this.notification.notify('error', 'TOKEN.PAGES.ADDTOKEN.NOTFOUND');
            } else {
                this.notification.notify('success', 'TOKEN.NOTIFICATIONS.TOKENADDED');
                this.router.navigate(['/token']);
            }
        } catch (ex) {
            if (isDevMode()) console.log(ex);
            this.errorService.diagnose(ex);
        }
        this.adding = false;
    }
}
