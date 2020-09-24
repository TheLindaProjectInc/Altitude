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
        const versionString = version.toString()
        const major = Number(versionString.substring(0, versionString.length - 6))
        const minor = Number(versionString.substring(1, versionString.length - 4))
        const rev = Number(versionString.substring(3, versionString.length - 2))
        const build = Number(versionString.substring(5, versionString.length))
        return `${major}.${minor}.${rev}.${build}`
    }
}