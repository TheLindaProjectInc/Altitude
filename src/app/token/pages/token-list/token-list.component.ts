import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { TokenService } from 'app/token/providers/token.service';
import { Token } from 'app/token/classes/token';
import { NFT } from 'app/token/classes/nft';
import { ContextMenuService } from 'app/components/context-menu/context-menu.service';

interface AddressCard {
    address: string;
    label: string;
    mrc20: Array<{ token: Token; balance: any }>;
    nfts: Array<{ token: Token; tokenId: string }>;
    nonEnumerable: Array<{ token: Token; count: number }>;
}

@Component({
    templateUrl: './token-list.component.html',
    styleUrls: ['./token-list.component.scss'],
    standalone: false
})
export class TokenListComponent {

    showEmptyAddresses = false;
    expandedNFTs: Set<string> = new Set();
    private nftCache: Map<string, NFT> = new Map();

    constructor(
        public wallet: WalletService,
        public token: TokenService,
        private router: Router,
        private contextMenu: ContextMenuService,
    ) { }

    get addressCards(): Array<AddressCard> {
        const cards: Array<AddressCard> = [];
        this.wallet.accounts.forEach(acc => {
            acc.addresses.forEach(addr => {
                const mrc20 = [];
                const nfts = [];
                const nonEnumerable = [];
                this.token.tokens.forEach(token => {
                    if (token.hidden) return;
                    if (token.type === 'MRC20') {
                        const balance = token.balanceFor(addr.address);
                        if (balance.gt(0)) mrc20.push({ token, balance });
                    } else {
                        token.ownedTokensFor(addr.address).forEach(tokenId => nfts.push({ token, tokenId }));
                        const count = token.nonEnumerableCountFor(addr.address);
                        if (count > 0) nonEnumerable.push({ token, count });
                    }
                });
                if (mrc20.length || nfts.length || nonEnumerable.length || this.showEmptyAddresses) {
                    cards.push({ address: addr.address, label: addr.newAccount || addr.account || acc.name, mrc20, nfts, nonEnumerable });
                }
            });
        });
        return cards;
    }

    get hiddenTokens(): Array<Token> {
        return this.token.tokens.filter(t => t.hidden);
    }

    toggleShowEmpty() {
        this.showEmptyAddresses = !this.showEmptyAddresses;
    }

    sendToken(token: Token, fromAddress: string, tokenId?: string) {
        const path = ['/token/send', token.address, fromAddress];
        this.router.navigate(path, tokenId !== undefined ? { queryParams: { tokenId } } : undefined);
    }

    nftKey(token: Token, tokenId: string): string {
        return token.address + ':' + tokenId;
    }

    // sequential-style collections (PYRO #115) show fine in full, but some (e.g. MNS
    // domain NFTs) use namehash-style tokenIds - 60+ digit numbers with no natural break
    // points that are meaningless to read in full and just fill the tile with digits
    formatTokenId(tokenId: string): string {
        if (tokenId.length <= 10) return tokenId;
        return tokenId.slice(0, 6) + '…' + tokenId.slice(-4);
    }

    isExpanded(token: Token, tokenId: string): boolean {
        return this.expandedNFTs.has(this.nftKey(token, tokenId));
    }

    getNFT(token: Token, tokenId: string, ownerAddress: string): NFT {
        const key = this.nftKey(token, tokenId);
        if (!this.nftCache.has(key)) this.nftCache.set(key, new NFT(token.address, tokenId, ownerAddress));
        return this.nftCache.get(key);
    }

    toggleNFT(token: Token, tokenId: string, ownerAddress: string) {
        const key = this.nftKey(token, tokenId);
        if (this.expandedNFTs.has(key)) {
            this.expandedNFTs.delete(key);
        } else {
            this.expandedNFTs.add(key);
            this.token.loadNFTMetadata(this.getNFT(token, tokenId, ownerAddress));
        }
    }

    onTokenRightClick(event, token: Token) {
        this.contextMenu.show(event, [
            { name: 'TOKEN.PAGES.LIST.CONTEXTMENUHIDE', func: () => this.token.hideToken(token) },
        ]);
    }

    unhideToken(token: Token) {
        this.token.unhideToken(token);
    }

    refresh() {
        this.token.refresh(true);
    }
}
