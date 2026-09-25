import { Injectable } from '@angular/core';
import { Interface, Result } from 'ethers';
import { RpcService, RPCMethods } from 'app/metrix/providers/rpc.service';
// deep-imported straight from metrilib's raw ABI JSON (it isn't re-exported from the
// package root) - using ethers.Interface against these directly, rather than metrilib's
// own MRC20/MRC721 wrapper classes, since those wrappers are built around metrilib's
// Provider abstraction which expects direct daemon HTTP credentials the renderer never
// has (only the main process does, via the CALLCLIENT IPC tunnel)
import { MRC20 as MRC20ABI } from '@metrixcoin/metrilib/lib/abi/metriverse/MRC20';
import { MRC721 as MRC721ABI } from '@metrixcoin/metrilib/lib/abi/metriverse/MRC721';

@Injectable()
export class TokenContractService {

    readonly mrc20Iface = new Interface(MRC20ABI);
    readonly mrc721Iface = new Interface(MRC721ABI);

    // ERC165 interface id for ERC721 - used to classify a discovered/added contract as MRC721
    readonly erc721InterfaceId = '80ac58cd';

    constructor(private rpc: RpcService) { }

    async call(contractAddress: string, iface: Interface, fnName: string, args: Array<any> = [], senderAddress?: string): Promise<Result> {
        const encoded = iface.encodeFunctionData(fnName, args).replace(/^0x/, '');
        const params = senderAddress ? [contractAddress, encoded, senderAddress] : [contractAddress, encoded];
        let data: any;
        try {
            data = await this.rpc.requestData(RPCMethods.CALLCONTRACT, params);
        } catch (ex) {
            return null;
        }
        if (!data || data.error || !data.executionResult || data.executionResult.excepted !== 'None') return null;
        try {
            return iface.decodeFunctionResult(fnName, '0x' + data.executionResult.output);
        } catch (ex) {
            return null;
        }
    }

    async send(contractAddress: string, iface: Interface, fnName: string, args: Array<any>, amount: number | string, gasLimit: number, gasPrice: string, senderAddress: string): Promise<any> {
        const encoded = iface.encodeFunctionData(fnName, args).replace(/^0x/, '');
        return this.rpc.requestData(RPCMethods.SENDTOCONTRACT, [contractAddress, encoded, amount, gasLimit, gasPrice, senderAddress]);
    }

    // wallet (base58) address -> the 20-byte hex form contracts expect
    async toHexAddress(address: string): Promise<string> {
        return this.rpc.requestData(RPCMethods.TOHEXADDRESS, [address]);
    }
}
