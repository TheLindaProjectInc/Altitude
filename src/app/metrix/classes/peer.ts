export interface Peer {
    addr: string
    addrlocal: string
    banscore: number;
    bytesrecv: number;
    bytessent: number;
    conntime: number;
    inbound: boolean;
    lastrecv: number;
    lastsend: number;
    pingtime: number;
    services: string
    startingheight: number;
    subver: string;
    syncnode: boolean;
    version: number;
}

