export class MasternodeStatus {
    setup: boolean = false;
    running: boolean = false;
    started: boolean = false;
    activeseconds: number = 0;
    address: string = '';
    lastTimeSeen: number = 0;
    pubkey: string = '';
    status: number = 0;

    list: Array<masternode> = new Array<masternode>();
    config: Array<masternodeConfig> = new Array<masternodeConfig>();
}

export interface masternode {
    activeseconds: number;
    address: string;
    allowFreeTx: boolean
    enabled: boolean;
    lastDseep: number;
    lastTimeSeen: number;
    minProtoVersion: number;
    nLastDsq: number;
    protocolVersion: number;
    pubkey: string;
    rank: number;
    vin: string;
    status?;
}

export interface masternodeConfig {
    address: string;
    alias: string;
    outputIndex: number;
    privateKey: string;
    txHash: string;
}