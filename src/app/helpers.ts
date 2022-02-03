import { ChainType } from './../../lib/client';
import Big from 'big.js';
import * as crypto from 'crypto';
import * as bs58 from 'bs58';

export default class Helpers {

  public static readonly params: CoinParams = {
    fee: 10,
    matureConfirms: 960,
    confirmations: 10,
    governance: {
      maturity: 15
    }
  }

  public static toSatoshi(amount: number | Big): Big | number {
    try {
      return (amount as Big).times(100000000);
    } catch (ex) {
      return Math.round(amount as number * 100000000);
    }
  }

  public static fromSatoshi(amount: number | Big): Big | number {
    try {
      return (amount as Big).div(100000000);
    } catch (ex) {
      return Math.round(amount as number / 100000000);
    }
  }

  public static roundCoins(coins: Big, decimals: number = 8): Big {
    const parts = coins.toFixed(8).toString().split(".");
    if (parts.length === 2) {
      const dec = Number("0." + parts[1]);
      const len = parts[1].length;
      if (len > decimals) {
        const decString = dec.toFixed(decimals).toString().split(".")[1];
        return Big(parts[0] + '.' + decString);
      }
    }
    return coins;
  }

  public static prettyCoins(coins: Big, decimals?: number): string {
    if (coins) {
      coins = this.roundCoins(coins, decimals);
      let parts = coins.toString().split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      if (parts.length > 1) return parts.join(".");
      return parts[0];
    }
    return '0';
  }

  public static getFee(numInputs: number, numOutputs: number): number {
    const totalBytes = this.getBytes(numInputs, numOutputs);
    const totalKb = totalBytes / 1000;
    const fee = Big(this.params.fee).mul(totalKb);
    return this.roundCoins(fee);
  }

  public static getBytes(numInputs: number, numOutputs: number): number {
    const baseSize = 10;
    const outputSize = 34;
    const changeSize = outputSize;
    const inputSize = 147;
    const inputBytes = inputSize * numInputs;
    const outputBytes = numOutputs * outputSize;
    return baseSize + inputBytes + outputBytes + changeSize;
  }

  public static formatTimeElapsed(amount, now = new Date()): string {
    let s = Math.round(now.getTime() / 1000) - amount;
    // check seconds
    if (s < 60) return s + 's';
    // check minutes
    let m = Math.floor(s / 60);
    s = s - m * 60;
    if (m < 60) return m + 'm ' + s + 's';
    // check hours
    let h = Math.floor(m / 60);
    m = m - h * 60;
    return h + 'h ' + m + 'm ' + s + 's';
  }

  public static formatTime(s): string {
    // check seconds
    if (s < 60) return s + 's';
    // check minutes
    let m = Math.floor(s / 60);
    s = s - m * 60;
    if (m < 60) return m + 'm ' + s + 's';
    // check hours
    let h = Math.floor(m / 60);
    m = m - h * 60;
    if (h < 24) return h + 'h ' + m + 'm ' + s + 's';
    let d = Math.floor(h / 24);
    h = h - d * 24;
    return d + 'd ' + h + 'h ' + m + 'm ' + s + 's';
  }

  public static friendlyTimeElapsed(amount, now = new Date()): Array<any> {
    const seconds = Math.round(now.getTime() / 1000) - Math.round(amount / 1000);
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;
    const months = days / 30.416;
    const years = days / 365;

    if (seconds <= 45)
      return [null, 'TIME.AFEWSECONDS'];
    else if (seconds <= 90)
      return [null, 'TIME.AMINUTE'];
    else if (minutes <= 50)
      return [Math.round(minutes), 'TIME.MINUTES'];
    else if (hours <= 1.5)
      return [null, 'TIME.ANHOUR'];
    else if (hours <= 22)
      return [Math.round(hours), 'TIME.HOURS'];
    else if (hours <= 36)
      return [null, 'TIME.ADAY'];
    else if (days <= 25)
      return [Math.round(days), 'TIME.DAYS'];
    else if (months <= 1.5)
      return [null, 'TIME.AMONTH'];
    else if (months <= 11.5)
      return [Math.round(months), 'TIME.MONTHS'];
    else if (years <= 1.5)
      return [null, 'TIME.AYEAR'];
    else
      return [Math.round(years), 'TIME.YEARS'];
  }

  public static guid(): string {
    let s4 = () => {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }

  public static validateURL(url: string): boolean {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return pattern.test(url);
  }

  static toMetrixAddress(hexAddress, isMainnet = false) {

    const MainnetNetworkByte = '32';
    const TestnetNetworkByte = '6E';

    // if (hexAddress === undefined || isEmpty(hexAddress)) {
    //   throw new Error('hexAddress should not be undefined or empty');
    // }
    // if (!Web3Utils.isHex(hexAddress)) {
    //   throw new Error('Invalid hex address');
    // }
    // reference: https://gobittest.appspot.com/Address
    let mAddress = hexAddress;
    // Add network byte
    if (isMainnet) {
      mAddress = MainnetNetworkByte + mAddress;
    } else {
      mAddress = TestnetNetworkByte + mAddress;
    }

    const mAddressBuffer = Buffer.from(mAddress, 'hex');
    // Double SHA256 hash
    const hash1 = crypto.createHash('sha256').update(mAddressBuffer).digest('hex');
    const hash1Buffer = Buffer.from(hash1, 'hex');
    const hash2 = crypto.createHash('sha256').update(hash1Buffer).digest('hex');

    // get first 4 bytes
    mAddress += hash2.slice(0, 8);

    // base58 encode
    const address = bs58.encode(Buffer.from(mAddress, 'hex'));
    return address;
  }

}


interface CoinParams {
  fee: number,
  matureConfirms: number,
  confirmations: number,
  governance: {
    maturity: number
  }
}