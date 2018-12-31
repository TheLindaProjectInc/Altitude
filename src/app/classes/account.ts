import Big from 'big.js';
import { Address } from './address';

export class Account {
    addresses = new Array<Address>();

    get balance(): Big {
        let balance = Big(0);
        this.addresses.forEach(address => balance = balance.add(address.balance));
        return balance;
    }

    get name(): string {
        let name;
        for (let i = 0; i < this.addresses.length; i++) {
            let address = this.addresses[i];
            if (address.account !== '(change)') {
                //if has a name use it
                if (address.newAccount !== '') {
                    name = address.newAccount;
                    break;
                }
            }
        }
        return name || 'Unnamed';
    }

    get address(): string {
        let addr = '';
        for (let i = 0; i < this.addresses.length; i++) {
            let address = this.addresses[i];
            //if has a name use it
            if (address.account !== '(change)' && address.account !== '') {
                addr = address.address;
                break;
            }
        }
        return addr || this.addresses[0].address;
    }

    get mainAddress(): Address {
        for (let i = 0; i < this.addresses.length; i++) {
            let address = this.addresses[i];
            if (address.account !== '(change)' && address.account !== '') return address;
        }
        return this.addresses[0];
    }

    get identicon(): string {
        return this.addresses[0].address + ' - ' + this.balance.toString();
    }

    syncAddresses(newAddresses: Array<Address>) {
        // add and update addresses from server
        newAddresses.forEach(addr => {
            let hasMatch = false;
            for (let i = 0; i < this.addresses.length; i++) {
                if (this.addresses[i].address === addr.address) {
                    this.addresses[i].removeFromAccount = false;
                    this.addresses[i].confirmations = addr.confirmations;
                    this.addresses[i].syncInputs(addr.allInputs());
                    hasMatch = true;
                }
            }
            if (!hasMatch) this.addresses.push(addr);
        })
    }

    removeRenamedAddresses() {
        // remove my addresses that are no longer in my account
        for (let i = 0; i < this.addresses.length; i++) {
            if (this.addresses[i].removeFromAccount)
                this.addresses.splice(i--, 1);
        }
    }

}