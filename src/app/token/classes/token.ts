import Big from 'big.js';

export type TokenType = 'MRC20' | 'MRC721';

export class Token {
    // hex contract address (no 0x prefix) - matches callcontract's own convention
    address: string = '';
    type: TokenType = 'MRC20';
    name: string = '';
    symbol: string = '';
    // MRC20 only
    decimals: number = 0;
    hidden: boolean = false;
    addedManually: boolean = false;

    // MRC20: wallet (base58) address -> balance in whole-token units
    balances: Map<string, Big> = new Map();
    // MRC721: wallet (base58) address -> owned tokenIds (decimal strings), for
    // contracts that implement the ERC721 Enumerable extension (tokenOfOwnerByIndex)
    ownedTokens: Map<string, Array<string>> = new Map();
    // MRC721 contracts that DON'T implement Enumerable: wallet (base58) address -> how
    // many the address holds (from balanceOf), since specific tokenIds can't be
    // determined without either Enumerable support or a log index
    nonEnumerableCounts: Map<string, number> = new Map();

    constructor(data?: Partial<Token>) {
        if (data) Object.assign(this, data);
    }

    get totalBalance(): Big {
        let total = Big(0);
        this.balances.forEach(balance => total = total.add(balance));
        return total;
    }

    get totalOwnedCount(): number {
        let count = 0;
        this.ownedTokens.forEach(ids => count += ids.length);
        this.nonEnumerableCounts.forEach(c => count += c);
        return count;
    }

    get hasHoldings(): boolean {
        return this.type === 'MRC20' ? this.totalBalance.gt(0) : this.totalOwnedCount > 0;
    }

    balanceFor(walletAddress: string): Big {
        return this.balances.get(walletAddress) || Big(0);
    }

    ownedTokensFor(walletAddress: string): Array<string> {
        return this.ownedTokens.get(walletAddress) || [];
    }

    nonEnumerableCountFor(walletAddress: string): number {
        return this.nonEnumerableCounts.get(walletAddress) || 0;
    }

    // converts a raw on-chain uint256 balance (smallest unit) into whole-token units,
    // mirroring Helpers.fromSatoshi's role for MRX but with this token's own decimals
    fromRaw(raw: bigint): Big {
        return Big(raw.toString()).div(Big(10).pow(this.decimals));
    }

    toRaw(amount: Big): bigint {
        return BigInt(amount.times(Big(10).pow(this.decimals)).toFixed(0));
    }
}
