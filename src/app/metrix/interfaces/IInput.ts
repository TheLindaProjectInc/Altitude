
import Big from 'big.js';

export default class IInput {
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
    selected: boolean;
}