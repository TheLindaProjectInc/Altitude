
import Big from 'big.js';
import IInput from '../interfaces/IInput';
import IAddress from '../interfaces/IAddress';

export class Input implements IInput {
    account: string;
    address: string;
    amount: Big;
    confirmations: number;
    scriptPubKey: string;
    txid: string;
    vout: number;
    blockTime: Date;
    matureTime: Date;
    locked: boolean;

    selected: boolean = false;

    constructor(rawData: any, address: IAddress, matureTime: number) {
        this.account = address.account;
        this.address = address.address;
        this.amount = Big(rawData.amount);
        this.confirmations = rawData.confirmations;
        this.scriptPubKey = rawData.scriptPubKey;
        this.txid = rawData.txid;
        this.vout = rawData.vout;
        this.locked = rawData.locked;
        if (rawData.blockTime) {
            let time = Number(rawData.blockTime);
            this.blockTime = new Date(time * 1000);
            this.matureTime = new Date((time + matureTime * 60 * 60) * 1000);
        }
    }

    sync(newInput: Input) {
        this.confirmations = newInput.confirmations;
        this.locked = newInput.locked;
    }
}
