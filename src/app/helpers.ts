import Big from 'big.js';

export default class Helpers {

  public static toSatoshi(amount: number | Big) {
    try {
      return (amount as Big).times(100000000);
    } catch (ex) {
      return Math.round(amount as number * 100000000);
    }
  }

  public static fromSatoshi(amount: number | Big) {
    try {
      return (amount as Big).div(100000000);
    } catch (ex) {
      return Math.round(amount as number / 100000000);
    }
  }

  public static roundCoins(coins: Big, decimals: number = 8): Big {
    const parts = coins.toString().split(".");
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

  public static prettyCoins(coins: Big, decimals?: number) {
    if (coins) {
      coins = this.roundCoins(coins, decimals);
      let parts = coins.toString().split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      if (parts.length > 1) return parts.join(".");
      return parts[0];
    }
    return 0;
  }


  public static getFee(numInputs: number, numOutputs: number, baseFee: number): number {
    const totalBytes = this.getBytes(numInputs, numOutputs);
    const feeMultiplier = Math.ceil(totalBytes / 1000);
    return Math.round(baseFee * feeMultiplier * 1000) / 1000;
  }

  public static getBytes(numInputs: number, numOutputs: number): number {
    const baseSize = 44;
    const outputSize = 34;
    const inputSize = 148;
    const inputBytes = inputSize * numInputs;
    const outputBytes = numOutputs * outputSize;
    return baseSize + inputBytes + outputBytes;
  }

  public static formatTimeEplased(amount, now = new Date()) {
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

  public static formatTime(s) {
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

  public static friendlyTimeEplased(amount, now = new Date()) {
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

}
