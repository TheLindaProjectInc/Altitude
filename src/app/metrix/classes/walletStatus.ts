import Big from 'big.js';

export class WalletStatus {
    connections: number = 0;
    version: string = "";
    unlocked_until: number = 0;
    encryption_status: string = EncryptionStatus.UNENCRYPTED;
    protocolversion: string = '';
    walletversion: string = '';
    errors: string = '';
    latestBlockHeight: number = 0;
    latestBlockTime: number = 0;
    stake: Big = Big(0);
}

export enum EncryptionStatus {
    UNENCRYPTED = 'Unencrypted',
    LOCKED = 'Locked',
    ENCRYPTING = "Encrypting",
    LOCKEDFORSTAKING = "LockedForStaking",
    UNLOCKEDANONYMONLY = "UnlockedForAnonymizationOnly",
    UNLOCKED = "Unlocked"
}