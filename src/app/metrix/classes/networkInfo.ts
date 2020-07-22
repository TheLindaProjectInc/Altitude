import Big from 'big.js';

export class NetworkInfo {
    connections: number = 0;
    incrementalfee: Big = Big(0);
    protocolversion: number = 0;
    relayfee: Big = Big(0);
    version: string = ""
    warnings: string = ""

    public sync(data: any) {
        this.connections = data.connections;
        this.incrementalfee = Big(data.incrementalfee);
        this.protocolversion = data.protocolversion;
        this.relayfee == Big(data.relayfee);
        this.version = this.parseVersion(data.version);
        this.warnings = data.warnings;
    }

    private parseVersion(version: number): string {
        let parts = version.toString().match(/.{1,2}/g);
        let parsedVersion = "";
        while (parts.length < 4) parts.splice(0, 0, '00');
        parts.forEach(p => {
            if (parsedVersion !== '') parsedVersion += '.';
            if (p[0] === '0') parsedVersion += p[1];
            else parsedVersion += p;
        })
        return parsedVersion;
    }
}