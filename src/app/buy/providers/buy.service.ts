import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class BuyService {
    readonly endpoint = 'https://buy.metrixcoin.com/api'

    constructor(
        private http: HttpClient,
    ) { }

    public async getPendingTransactions(address: string) {
        let url = `${this.endpoint}/swap/getPendingTransactions/${address}`;
        return this.httpGetRequest(url);
    }

    public async getSwapAddress(MRXAddress: string) {
        let url = `${this.endpoint}/swap/getAddress/${MRXAddress}`;
        return this.httpGetRequest(url);
    }

    public async estimate(amount: number, type: string) {
        let url = `${this.endpoint}/swap/estimate?${type}=${amount}`;
        return this.httpGetRequest(url);
    }

    private httpGetRequest(url: string) {
        return new Promise((resolve, reject) => {
            this.http.get(url).subscribe((data: any) => {
                resolve(data);
            }, error => {
                reject(error)
            });
        })
    }

    private httpPostRequest(url: string, body: any) {
        return new Promise((resolve, reject) => {
            this.http.post(url, body).subscribe((data: any) => {
                resolve(data);
            }, error => {
                reject(error)
            });
        })
    }

}