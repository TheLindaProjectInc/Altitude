export default interface IAddress {
    address: string;
    account: string;
    newAccount: string;
    confirmations: number;
    amount: number;
    renaming: boolean;
    removeFromAccount: boolean;
}