import { U256 } from '../../../../node_modules/uint256/dist/UInt256';
import Helpers from 'app/helpers';
import Big from 'big.js';
import * as  urlMetadata from 'url-metadata';
import { BudgetVote } from 'app/enum';

export class BudgetProposal {
    id: string;
    ownerHexAddress: string;
    owner: string;
    title: string;
    desc: string;
    url: string;
    requested: Big;
    duration: number = 1
    durationsPaid: number;
    votes: object;
    yesVote: number = 0;
    noVote: number = 0;
    imgUrl: string = 'assets/img/metrix-logo.png';
    myVote: BudgetVote = BudgetVote.NONE;
    removed: number = 0;
    // set once loadImageIfNeeded() has been called, successful or not, so a proposal
    // re-fetched on every new block doesn't re-request its image metadata forever -
    // once attempted (or already loaded), later refresh passes skip it entirely
    private imgLoadAttempted: boolean = false;

    constructor(contractData?: any) {
        if (contractData) {
            let chunks: Array<string> = contractData.executionResult.output.match(new RegExp('.{1,64}', 'g'));
            this.id = chunks[0];
            this.ownerHexAddress = chunks[1].substring(24, 64);
            this.title = this.extractString(2, chunks, contractData.executionResult.output);
            this.desc = this.extractString(3, chunks, contractData.executionResult.output);
            this.url = this.extractString(4, chunks, contractData.executionResult.output);
            this.requested = Number(U256(chunks[5], 16));
            this.duration = Number(U256(chunks[6], 16));
            this.durationsPaid = Number(U256(chunks[7], 16));
            this.yesVote = Number(U256(chunks[8], 16));
            this.noVote = Number(U256(chunks[9], 16));
            this.removed = Number(U256(chunks[10], 16));
        }
    }

    // called explicitly by the caller (not from the constructor) so a proposal that's
    // just being re-fetched to pick up updated vote counts - and whose image was
    // already loaded, or already attempted, on a previous pass - doesn't trigger a
    // redundant network fetch every time a new block arrives
    public loadImageIfNeeded(delayMs: number = 0) {
        if (this.imgLoadAttempted) return;
        this.imgLoadAttempted = true;
        if (Helpers.validateURL(this.url)) this.loadImg(delayMs);
    }

    private extractString(index: number, chunks: Array<string>, output: string): string {
        let textLocation = Number(U256(chunks[index], 16)) / 32;
        let textLength = Number(U256(chunks[textLocation], 16));
        let textString = output.substring(textLocation * 64 + 64, textLocation * 64 + 64 + textLength * 2)
        return Buffer.from(textString, 'hex').toString();
    }

    // fired independently per-proposal (not awaited by the caller), so without a
    // stagger every proposal loaded in the same batch fires its metadata fetch at once
    // - several proposals often link to github.com URLs, and bursting anonymous
    // requests there like that is exactly what trips their rate limit (429)
    private async loadImg(delayMs: number = 0) {
        try {
            if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
            let metadata = await urlMetadata(this.url);
            this.imgUrl = metadata['og:image'] || metadata['image'] || this.imgUrl;
        } catch (ex) {
        }
    }

    public setMyVote(data: string) {
        this.myVote = Number(U256(data, 16));
    }

    public update(updatedBudget: BudgetProposal) {
        this.durationsPaid = updatedBudget.durationsPaid;
        this.yesVote = updatedBudget.yesVote;
        this.noVote = updatedBudget.noVote;
    }
}