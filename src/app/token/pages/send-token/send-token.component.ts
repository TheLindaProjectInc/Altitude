import { Component, OnInit, isDevMode } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Big from 'big.js';
import { TokenService } from 'app/token/providers/token.service';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { PromptService } from 'app/components/prompt/prompt.service';
import { NotificationService } from 'app/providers/notification.service';
import { ErrorService } from 'app/providers/error.service';
import { AddressBookService } from 'app/metrix/components/address-book/address-book.service';
import { Token } from 'app/token/classes/token';

@Component({
    templateUrl: './send-token.component.html',
    styleUrls: ['./send-token.component.scss'],
    standalone: false
})
export class SendTokenComponent implements OnInit {

    token: Token;
    fromAddress = '';
    tokenId = '';
    recipient = '';
    amount = '';
    gasLimit: number;
    gasPrice = '';
    sending = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        public tokenService: TokenService,
        public wallet: WalletService,
        private prompt: PromptService,
        private notification: NotificationService,
        private errorService: ErrorService,
        private addressBook: AddressBookService,
    ) { }

    async ngOnInit() {
        const contractAddress = this.route.snapshot.paramMap.get('contractAddress');
        this.fromAddress = this.route.snapshot.paramMap.get('fromAddress');
        this.tokenId = this.route.snapshot.queryParamMap.get('tokenId') || '';
        this.token = this.tokenService.tokens.find(t => t.address === contractAddress);
        this.gasLimit = this.tokenService.defaultGasLimit;
        this.gasPrice = await this.tokenService.getDefaultGasPrice();
    }

    get balance(): Big {
        if (!this.token) return Big(0);
        return this.token.balanceFor(this.fromAddress);
    }

    useMax() {
        this.amount = this.balance.toString();
    }

    async getFromAddressBook() {
        const addr = await this.addressBook.getAddress();
        if (addr) this.recipient = addr.address;
    }

    checkFormValid(): boolean {
        if (!this.token || !this.fromAddress || !this.recipient) return false;
        if (this.token.type === 'MRC20') {
            if (!this.amount || Big(this.amount).lte(0) || Big(this.amount).gt(this.balance)) return false;
        } else if (!this.tokenId) {
            return false;
        }
        if (!this.gasLimit || this.gasLimit <= 0) return false;
        if (!this.gasPrice || Number(this.gasPrice) <= 0) return false;
        return true;
    }

    async send() {
        if (this.sending) return;
        if (!this.checkFormValid()) {
            this.notification.notify('error', 'TOKEN.NOTIFICATIONS.INCOMPLETEFORM');
            return;
        }
        this.sending = true;
        let passphrase;
        try {
            if (this.wallet.requireUnlock()) [passphrase] = await this.prompt.getPassphrase();
        } catch (ex) {
            // passphrase prompt closed
            this.sending = false;
            return;
        }
        this.notification.loading('NOTIFICATIONS.SENDINGTRANSACTION');
        try {
            if (this.token.type === 'MRC20') {
                await this.tokenService.sendMRC20(this.token, this.fromAddress, this.recipient, Big(this.amount), this.gasLimit, this.gasPrice, passphrase);
            } else {
                await this.tokenService.sendMRC721(this.token, this.fromAddress, this.recipient, this.tokenId, this.gasLimit, this.gasPrice, passphrase);
            }
            this.notification.notify('success', 'TOKEN.NOTIFICATIONS.TOKENSENT');
            this.router.navigate(['/token']);
        } catch (ex) {
            if (isDevMode()) console.log(ex);
            this.errorService.diagnose(ex);
        }
        this.sending = false;
    }
}
