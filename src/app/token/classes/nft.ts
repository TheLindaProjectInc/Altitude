export class NFT {
    contractAddress: string;
    tokenId: string;
    // wallet (base58) address that currently owns it
    ownerAddress: string;

    // metadata is only ever fetched on-demand (user expands the tile), never eagerly on
    // discovery - auto-fetching arbitrary attacker-controlled tokenURI content the moment
    // a token is merely detected is the real privacy/SSRF concern here
    metadataLoading: boolean = false;
    metadataLoaded: boolean = false;
    metadataError: boolean = false;
    tokenURI?: string;
    name?: string;
    description?: string;
    image?: string;

    constructor(contractAddress: string, tokenId: string, ownerAddress: string) {
        this.contractAddress = contractAddress;
        this.tokenId = tokenId;
        this.ownerAddress = ownerAddress;
    }
}
