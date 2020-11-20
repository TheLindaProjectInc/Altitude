import Big from 'big.js';

export class WalletInfo {
    balance: Big = Big(0);
    immature_balance: Big = Big(0);
    unconfirmed_balance: Big = Big(0);
    stake: Big = Big(0);
    unlocked_until: number = 0;
    encryption_status: string = EncryptionStatus.UNENCRYPTED;
    walletversion: string = '';
    walletname: string = "";
    errors: string = '';
    startupBlockTime: number = 0;

    public sync(data: any) {
        this.balance = Big(data.balance);
        this.immature_balance = Big(data.immature_balance);
        this.unconfirmed_balance = Big(data.unconfirmed_balance);
        this.stake = Big(data.stake);
        this.unlocked_until = data.unlocked_until;
        this.encryption_status = data.encryption_status;
        this.walletversion = data.walletversion;
        this.walletname = data.walletname;
        this.errors = data.errors;
    }

    public get totalBalance(): Big {
        return this.balance.add(this.immature_balance).add(this.unconfirmed_balance).add(this.stake);
    }

    public get pendingBalance(): Big {
        return this.immature_balance.add(this.unconfirmed_balance).add(this.stake);
    }
}

export enum EncryptionStatus {
    UNENCRYPTED = 'Unencrypted',
    LOCKED = 'Locked',
    ENCRYPTING = "Encrypting",
    LOCKEDFORSTAKING = "LockedForStaking",
    UNLOCKED = "Unlocked"
}