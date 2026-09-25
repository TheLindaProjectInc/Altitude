import { Injectable, EventEmitter, Output, Directive } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Helpers from 'app/helpers';
import Big from 'big.js';
import { PriceOracle } from 'app/providers/priceoracle.service';

// frankfurter.dev - free, no API key required. v1 is deprecated, use v2.
const FRANKFURTER_RATES_URL = 'https://api.frankfurter.dev/v2/rates?base=USD';
const FRANKFURTER_CURRENCIES_URL = 'https://api.frankfurter.dev/v2/currencies';

@Directive()
@Injectable()
export class CurrencyService {

    public marketLoadFailed = false;
    // MRX is always available. USD needs the on-chain oracle; every other currency
    // additionally needs Frankfurter, using that oracle's USD price as a middleman
    // (MRX -> USD via the oracle, USD -> fiat via Frankfurter).
    public currencies = ['MRX'];
    private selectedCurrency = 'MRX';
    // USD per MRX, derived from the MNS MRXtoUSDOracle (@metrixnames/pricelib)
    private usdPrice: Big | undefined;
    // currency code -> units per 1 USD, from Frankfurter
    private fiatRates: { [currency: string]: number } = {};
    // currency code -> full display name, for the currency picker's tooltip
    private currencyNames: { [currency: string]: string } = { MRX: 'Metrix' };

    @Output() currencyChange: EventEmitter<any> = new EventEmitter();

    constructor(
        private priceOracle: PriceOracle,
        private http: HttpClient,
    ) {
        this.getMarket();
        this.getFiatRates();
        this.getCurrencyNames();
    }

    public get currency() {
        if (this.currencies.indexOf(this.selectedCurrency) > -1) return this.selectedCurrency
        return 'MRX';
    }

    private async getMarket() {
        this.marketLoadFailed = false;
        // the price oracle contract is only deployed on MainNet - on TestNet/RegTest
        // (or before the node has finished connecting) `oracle` stays undefined
        if (!this.priceOracle.oracle) {
            this.usdPrice = undefined;
            this.marketLoadFailed = true;
            this.rebuildCurrencies();
            setTimeout(() => this.getMarket(), 1000 * 60 * 5);
            return;
        }
        try {
            // value() is MRX satoshi per USD - invert it (after shifting the 8 decimal
            // places) to get USD per whole MRX
            const satoshiPerUsd = await this.priceOracle.oracle.value();
            this.usdPrice = new Big(1).div(new Big(satoshiPerUsd.toString()).times('1e-8'));
        } catch (ex) {
            this.marketLoadFailed = true;
        }
        this.rebuildCurrencies();
        // the oracle price only updates roughly hourly on-chain, but refresh reasonably
        // often so a stale local cache doesn't linger too long
        setTimeout(() => this.getMarket(), 1000 * 60 * 15);
    }

    private getFiatRates() {
        this.http.get<{ base: string, quote: string, rate: number }[]>(FRANKFURTER_RATES_URL)
            .subscribe({
                next: (rates) => {
                    this.fiatRates = {};
                    (rates || []).forEach(entry => this.fiatRates[entry.quote] = entry.rate);
                    this.rebuildCurrencies();
                },
                error: () => {
                    // keep whatever rates were last fetched successfully
                },
            });
        // Frankfurter's underlying (ECB) rates only publish once per weekday - no need to poll more often
        setTimeout(() => this.getFiatRates(), 1000 * 60 * 60);
    }

    // names practically never change, so this is a one-off fetch rather than a
    // repeating poll (unlike the rates and oracle price) - only retried on failure
    private getCurrencyNames() {
        this.http.get<{ iso_code: string, name: string }[]>(FRANKFURTER_CURRENCIES_URL)
            .subscribe({
                next: (currencies) => {
                    (currencies || []).forEach(entry => this.currencyNames[entry.iso_code] = entry.name);
                },
                error: () => {
                    setTimeout(() => this.getCurrencyNames(), 1000 * 60 * 5);
                },
            });
    }

    public currencyName(code: string): string {
        return this.currencyNames[code] || code;
    }

    private rebuildCurrencies() {
        // without a live USD price there's nothing to convert MRX into, regardless of
        // what fiat rates are available
        this.currencies = this.usdPrice ? ['MRX', 'USD', ...Object.keys(this.fiatRates).filter(c => c !== 'USD').sort()] : ['MRX'];
    }

    public changeCurrency(currency) {
        this.selectedCurrency = currency;
        this.currencyChange.emit();
    }

    public convert(amount, parseSatoshi = false) {
        if (this.usdPrice && this.currency !== 'MRX') {
            let value = parseSatoshi ? Helpers.fromSatoshi(amount) : amount;
            let usdAmount = this.usdPrice.mul(value);
            const rate = this.fiatRates[this.currency];
            amount = rate ? usdAmount.mul(rate) : usdAmount;
        }
        return amount
    }

    public displayLocal(amount, format = true, parseSatoshi = false) {
        const converted = this.convert(amount, parseSatoshi)
        // fiat currencies (USD, EUR, ...) display with 2dp, matching how they're normally
        // written - MRX keeps its full 8dp (satoshi) precision
        const decimals = this.currency === 'MRX' ? 8 : 2;
        return format ? Helpers.prettyCoins(converted, decimals) : converted + ' ' + this.currency;
    }


}
