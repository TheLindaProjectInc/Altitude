// Result shape of the daemon's `createcontract` RPC, confirmed against the reference Qt
// wallet's own result parsing (src/qt/contractresult.cpp, ContractResult::updateCreateResult)
export default interface ICreateContractResult {
    txid: string;
    sender: string;
    hash160: string;
    address: string;
}
