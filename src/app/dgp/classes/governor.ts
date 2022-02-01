import { U256 } from '../../../../node_modules/uint256/dist/UInt256';
import Helpers from 'app/helpers';

export class Governor {
    blockHeight: number; // enrollment block height
    lastPing: number; // last ping block
    collateral: number; // contract held collateral
    lastReward: number; // last block governor was rewarded
    address: String // metrix address of governor

    constructor(address: String, contractData: any) {
        this.address = address;

        this.update(contractData)
    }

    update(contractData: any) {
        let chunks = contractData.executionResult.output.match(new RegExp('.{1,64}', 'g'));
        this.blockHeight = Number(U256(chunks[0], 16));
        this.lastPing = Number(U256(chunks[1], 16));
        this.collateral = Helpers.fromSatoshi(Number(U256(chunks[2], 16)));
        this.lastReward = Number(U256(chunks[3], 16));
    }
}