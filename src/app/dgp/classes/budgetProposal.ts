import { U256 } from 'uint256';
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

            if (Helpers.validateURL(this.url)) this.loadImg();
        }
    }

    private extractString(index: number, chunks: Array<string>, output: string): string {
        let textLocation = Number(U256(chunks[index], 16)) / 32;
        let textLength = Number(U256(chunks[textLocation], 16));
        let textString = output.substring(textLocation * 64 + 64, textLocation * 64 + 64 + textLength * 2)
        return Buffer.from(textString, 'hex').toString();
    }

    private async loadImg() {
        try {
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