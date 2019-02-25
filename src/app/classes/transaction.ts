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
    vout: number;

    constructor(transactionData?) {
        if (transactionData) {
            this.account = transactionData.account;
            this.address = transactionData.address;
            this.category = transactionData.category;
            this.subCategory = transactionData.subcategory;
            this.confirmations = transactionData.confirmations;
            this.blockHash = transactionData.blockhash;
            this.blockIndex = transactionData.blockindex;
            this.txId = transactionData.txid;
            this.fee = transactionData.fee;
            this.vout = transactionData.vout;

            // convert amounts
            this.amount = Big(transactionData.amount);

            // convert dates
            if (transactionData.blocktime) this.blockTime = new Date(transactionData.blocktime * 1000);
            this.timestamp = new Date(transactionData.time * 1000);

            // santise subcategory
            if (this.subCategory === "mined") this.subCategory = "Mined"
            if (this.subCategory === "minted") this.subCategory = "Minted"
            if (this.subCategory === "masternode reward") this.subCategory = "Masternode Reward"
            // santise category
            if (this.category === "send") this.category = "Payment"
            if (this.category === "generate") this.category = "Generated"
            if (this.category === "receive") this.category = "Received"
            if (this.category === "immature") this.category = "Immature"
            if (this.category === "orphan") this.category = "Orphan"
        }
    }

    update(trx: Transaction) {
        if (this.confirmations != trx.confirmations) this.confirmations = trx.confirmations;
        if (this.blockHash != trx.blockHash) this.blockHash = trx.blockHash;
        if (this.blockIndex != trx.blockIndex) this.blockIndex = trx.blockIndex
        if (this.blockTime != trx.blockTime) this.blockTime = trx.blockTime;
        if (this.timestamp != trx.timestamp) this.timestamp = trx.timestamp;
    }

}

