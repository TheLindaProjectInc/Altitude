import { Input } from "./input";
import Big from 'big.js';
import IAddress from '../interfaces/IAddress';

export class Address implements IAddress {
    address: string;
    account: string;
    newAccount: string;
    confirmations: number;
    amount: number = 0;
    private inputs: Array<Input> = [];
    renaming: boolean = false;
    watchOnly: boolean = false;

    // used to denote if an address should be removed from this account
    removeFromAccount: boolean = false;

    constructor(addressData) {
        this.address = addressData.address;
        this.account = addressData.account;
        this.newAccount = this.account;
        this.confirmations = addressData.confirmations;
        this.watchOnly = addressData.watchOnly;
        if (addressData.unspents) {
            addressData.unspents.forEach(unspent => {
                this.inputs.push(new Input(unspent, this));
            })
        }
    }

    get balance(): Big {
        let balance = Big(0);
        this.inputs.forEach(input => balance = balance.add(input.amount));
        return balance;
    }

    syncInputs(newInputs: Array<Input>) {
        // add and update inputs from server
        newInputs.forEach(inp => {
            let hasMatch = false;
            for (let i = 0; i < this.inputs.length; i++) {
                if (this.inputs[i].txid === inp.txid && this.inputs[i].vout === inp.vout) {
                    this.inputs[i].sync(inp);
                    hasMatch = true;
                }
            }
            if (!hasMatch) this.inputs.push(inp);
        })

        // remove my inputs that aren't in the new list from the server
        for (let i = 0; i < this.inputs.length; i++) {
            let hasMatch = false;
            for (let j = 0; j < newInputs.length; j++) {
                if (this.inputs[i].txid === newInputs[j].txid && this.inputs[i].vout === newInputs[j].vout) {
                    hasMatch = true;
                    break;
                }
            }
            if (!hasMatch) this.inputs.splice(i--, 1);
        }
    }

    spendableInputs(): Array<Input> {
        let inputs = new Array<Input>();
        this.inputs.forEach(inp => {
            if (!inp.locked) inputs.push(inp);
        });
        return inputs;
    }

    allInputs(): Array<Input> {
        return this.inputs;
    }

}

