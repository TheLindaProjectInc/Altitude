import { Injectable, EventEmitter, Output, Directive } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Helpers from 'app/helpers';
import Big from 'big.js';

@Directive()
@Injectable()
export class CurrencyService {

    public marketLoadFailed = false;
    public market;
    public currencies = [];
    private selectedCurrency = 'MRX';
    private charts = {};


    @Output() currencyChange: EventEmitter<any> = new EventEmitter();

    constructor(
        private http: HttpClient
    ) {
        this.getMarket();
    }

    public get currency() {
        if (this.currencies.length) return this.selectedCurrency
        return 'MRX';
    }

    private async getMarket() {
        this.marketLoadFailed = false;
        this.http.get(`https://api.coingecko.com/api/v3/coins/linda`)
            .subscribe((data: any) => {
                this.currencies = ['MRX'];
                Object.keys(data.market_data.current_price).forEach(key => {
                    this.currencies.push(key.toUpperCase());
                });
                this.market = data;
            }, error => {
                this.marketLoadFailed = true;
            });
        // update market every 12 hours
        setTimeout(() => this.getMarket(), 1000 * 60 * 60 * 12)
    }

    public async getMarketChart(period: number) {
        return new Promise((resolve, reject) => {
            if (this.charts[period] && this.charts[period].expires < new Date().getTime()) {
                resolve(this.charts[period].prices);
            } else {
                this.http.get(`https://api.coingecko.com/api/v3/coins/linda/market_chart?vs_currency=BTC&days=${period}`)
                    .subscribe((data: any) => {
                        this.charts[period] = {
                            prices: data.prices,
                            expires: new Date().getTime() + 1000 * 60 * 60
                        };
                        resolve(data.prices);
                    }, error => {
                        reject(error)
                    });
            }
        })
    }

    public changeCurrency(currency) {
        this.selectedCurrency = currency;
        this.currencyChange.emit();
    }

    public convert(amount, parseSatoshi = false) {
        if (this.market && this.currency !== 'MRX') {
            let key = this.currency.toLowerCase();
            let price = new Big(this.market.market_data.current_price[key]);
            let value = parseSatoshi ? Helpers.fromSatoshi(amount) : amount;
            amount = price.mul(value);
        }
        return amount
    }

    public displayLocal(amount, parseSatoshi = false) {
        return this.convert(amount, parseSatoshi) + ' ' + this.currency;
    }


}
