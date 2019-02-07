import Big from 'big.js';

export class Transaction {
    account: string;
    address: string;
    category: string;
    subCategory: string;
    amount: Big;
    confirmations: number;
    blockHash: string;
    blockIndex: number;
    blockTime: Date;
    txId: string;
    timestamp: Date;
    fee: number;

    constructor(transactionData?) {
        if (transactionData) {
            this.account = transactionData.account;
            this.address = transactionData.address;
            this.category = transactionData.category;
            this.subCategory = transactionData.subCategory;
            this.amount = Big(transactionData.amount);
            this.confirmations = transactionData.confirmations;
            this.blockHash = transactionData.blockHash;
            this.blockIndex = transactionData.blockIndex;
            if (transactionData.blockTime) this.blockTime = new Date(transactionData.blockTime * 1000);
            this.txId = transactionData.txId;
            this.timestamp = new Date(transactionData.timestamp * 1000);
            this.fee = transactionData.fee;
        }
    }

}

