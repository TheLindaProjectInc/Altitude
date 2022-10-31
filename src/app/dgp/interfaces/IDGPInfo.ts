export default class IDGPInfo {
    blockgaslimit: number;
    budgetfee: number;
    governancecollateral: number;
    maxblocksize: number;
    mingasprice: number;
    contracts: {
        version: number;
        dgp: string;
        governance: string;
        budget: string;
    }
}