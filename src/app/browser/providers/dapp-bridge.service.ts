import { Injectable } from '@angular/core';
import { RpcService, RPCMethods } from 'app/metrix/providers/rpc.service';
import { WalletService } from 'app/metrix/providers/wallet.service';
import { ElectronService } from 'app/providers/electron.service';
import { PromptService } from 'app/components/prompt/prompt.service';
import { NotificationService } from 'app/providers/notification.service';
import { ChainType } from 'app/enum';

const BRIDGE_CHANNEL = 'metrimask-bridge';
const RELAY_CHANNEL = 'metrimask-bridge-relay';

interface BridgeMessage {
    id: string;
    type: string;
    method: string;
    params: any[];
}

@Injectable()
export class DappBridgeService {

    // per-origin approved connection, session-only (reset on app restart)
    private approvedOrigins = new Map<string, string>();
    private connectedWebviews = new Set<any>();
    // dedupes concurrent CONNECT requests for the same origin so they share one approval prompt
    private pendingApprovals = new Map<string, Promise<string>>();

    constructor(
        private rpc: RpcService,
        private wallet: WalletService,
        private electron: ElectronService,
        private prompt: PromptService,
        private notification: NotificationService,
    ) {
        // the daemon is restarted when the user switches network (mainnet/testnet/regtest);
        // once RPC comes back up push the live network to any connected dApp
        if (this.electron.isElectron()) {
            this.electron.RCPStatusEvent.subscribe((status: { ready: boolean }) => {
                if (status.ready) this.notifyChainChanged();
            });
        }
    }

    public get networkName(): string {
        switch (this.electron.chain) {
            case ChainType.TESTNET: return 'TestNet';
            case ChainType.REGTEST: return 'RegTest';
            default: return 'MainNet';
        }
    }

    public registerWebview(webviewEl: any) {
        this.connectedWebviews.add(webviewEl);
        webviewEl.addEventListener('ipc-message', (event: any) => {
            if (event.channel === BRIDGE_CHANNEL) this.handleMessage(webviewEl, event.args[0]);
        });
        webviewEl.addEventListener('did-navigate', () => this.pushCurrentAccount(webviewEl));
    }

    public unregisterWebview(webviewEl: any) {
        this.connectedWebviews.delete(webviewEl);
    }

    // called when the active network (mainnet/testnet/regtest) changes so
    // any connected dApp sees the live network rather than a stale value
    public notifyChainChanged() {
        this.connectedWebviews.forEach(webviewEl => this.pushCurrentAccount(webviewEl));
    }

    private sendToGuest(webviewEl: any, payload: any) {
        const webContentsId = webviewEl.getWebContentsId();
        this.electron.ipcRenderer.send(RELAY_CHANNEL, { webContentsId, payload });
    }

    private pushCurrentAccount(webviewEl: any) {
        const origin = this.originFor(webviewEl);
        const address = origin && this.approvedOrigins.get(origin);
        if (!address) return;
        this.sendToGuest(webviewEl, { event: 'ACCOUNT_CHANGED', account: this.accountFor(address) });
    }

    private originFor(webviewEl: any): string {
        try {
            return new URL(webviewEl.getURL()).origin;
        } catch (ex) {
            return '';
        }
    }

    private findAccountByAddress(address: string) {
        return this.wallet.accounts.find(account => account.hasAddress(address));
    }

    private accountFor(address: string) {
        const account = this.findAccountByAddress(address);
        return {
            loggedIn: true,
            name: account ? account.name : address,
            network: this.networkName,
            address,
            balance: account ? Number(account.balance) : 0,
        };
    }

    private defaultAddress(): string {
        const accounts = this.wallet.getAccounts(true);
        return accounts.length ? accounts[0].address : '';
    }

    public async handleMessage(webviewEl: any, message: BridgeMessage) {
        const { id, type, method, params } = message;
        const origin = this.originFor(webviewEl);
        try {
            if (type === 'CONNECT') return await this.handleConnect(webviewEl, id, origin);
            if (type === 'RAWCALL') return await this.handleRawCall(webviewEl, id, origin, method, params || []);
        } catch (ex) {
            // an undefined ex means the user simply clicked Reject on an approval prompt - no
            // need to also notify, they already know. Anything else is a genuine failure (e.g.
            // an RPC error) that the dApp itself may not surface or may even crash on trying to
            // handle (seen in practice), so make sure it's visible somewhere the user will see it
            if (ex) this.notification.notify('error', this.errorMessage(ex), false);
            this.sendToGuest(webviewEl, { id, type, result: null, error: this.errorMessage(ex) });
        }
    }

    // RPC failures reject with the raw { success, code, body: { error: { message } } } envelope
    // from Client.callClient (see rpc.service.ts), not an Error instance - falling back straight
    // to a generic string here previously hid the real reason (e.g. bad gas price) behind a
    // misleading "Request rejected", indistinguishable from the user actually clicking Reject
    private errorMessage(ex: any): string {
        if (!ex) return 'Request rejected';
        return (ex.body && ex.body.error && ex.body.error.message) || ex.message || 'Request rejected';
    }

    private async handleConnect(webviewEl: any, id: string, origin: string) {
        try {
            const address = await this.resolveApproval(origin);
            this.sendToGuest(webviewEl, { id, type: 'CONNECT', result: this.accountFor(address) });
        } catch (ex) {
            this.sendToGuest(webviewEl, { id, type: 'CONNECT', result: { loggedIn: false } });
        }
    }

    // some pages fire the connect handshake more than once in quick succession (e.g. two
    // mount-time effects both triggering it). Without this, each concurrent CONNECT request
    // called prompt.alert() independently against the same singleton modal, silently
    // overwriting the first request's resolve/reject - that request's promise then never
    // settled and the dApp just hung waiting on it. Caching the in-flight promise per origin
    // means concurrent requests share the same single approval prompt instead.
    private resolveApproval(origin: string): Promise<string> {
        const approved = this.approvedOrigins.get(origin);
        if (approved) return Promise.resolve(approved);
        let inFlight = this.pendingApprovals.get(origin);
        if (!inFlight) {
            inFlight = this.requestApproval(origin).finally(() => this.pendingApprovals.delete(origin));
            this.pendingApprovals.set(origin, inFlight);
        }
        return inFlight;
    }

    private async requestApproval(origin: string): Promise<string> {
        const candidate = this.defaultAddress();
        if (!candidate) {
            // otherwise this fails invisibly: the dApp just never gets an account and
            // there is no way for the user to tell "not ready yet" from "broken"
            this.notification.notify('error', this.rpc.RPCReady
                ? 'COMPONENTS.PROMPT.DAPPNOWALLET'
                : 'COMPONENTS.PROMPT.DAPPNOTREADY');
            throw new Error('No wallet address available');
        }
        await this.prompt.connectApproval(origin, candidate);
        this.approvedOrigins.set(origin, candidate);
        return candidate;
    }

    private async handleRawCall(webviewEl: any, id: string, origin: string, method: string, params: any[]) {
        let result;
        switch ((method || '').toLowerCase()) {
            case 'callcontract':
                result = await this.rpc.requestData(RPCMethods.CALLCONTRACT, params);
                break;
            case 'verifymessage':
                // dApp-facing order is [message, address, signedMessage, usePrefix] (MetriMask's
                // documented rawCall signature); the underlying RPC expects [address, signature, message]
                result = await this.verifyMessage(params);
                break;
            case 'sendtocontract':
                result = await this.sendToContract(origin, params);
                break;
            case 'signmessage':
                result = await this.signMessage(origin, params);
                break;
            default:
                return this.sendToGuest(webviewEl, { id, result: null, error: `Unsupported method: ${method}` });
        }
        this.sendToGuest(webviewEl, { id, result });
    }

    private requireApproved(origin: string): string {
        const address = this.approvedOrigins.get(origin);
        if (!address) throw new Error('Site is not connected. Connect before sending requests.');
        return address;
    }

    // mirrors dgp.service.ts's submitBudgetProposal/submitBudgetVote pattern:
    // unlock -> sendtocontract -> lock, wrapped in an explicit user approval prompt
    private async sendToContract(origin: string, params: any[]) {
        const senderAddress = this.requireApproved(origin);
        const [contractAddress, data, amount, gasLimit, gasPrice] = params;
        const amountVal = Number(amount) || 0;

        // dApp-supplied gasLimit/gasPrice are only starting values here - the modal lets the
        // user review and edit them before approving, same as any wallet's gas controls
        const approved: any = await this.prompt.sendContractApproval(
            origin, contractAddress, amountVal, data, gasLimit || 250000, gasPrice || 5000
        );

        // MetriMask's documented rawCall signature takes gasPrice in satoshi (min/default 5000),
        // but the underlying sendtocontract RPC command expects a decimal MRX-per-gas-unit value -
        // confirmed against the real MetriMask extension's rpcController, which converts the same
        // way (gasPrice * 1e-8) before calling the wallet. Passing the raw satoshi value straight
        // through here made every transaction request an absurd MRX/gas price that failed instantly.
        const rpcGasPrice = (Number(approved.gasPrice) * 1e-8).toFixed(8);

        let passphrase = '';
        if (this.wallet.requireUnlock()) {
            [passphrase] = await this.prompt.getPassphrase();
        }

        try {
            await this.rpc.unlockWalletForCommand(passphrase);
            const result = await this.rpc.requestData(RPCMethods.SENDTOCONTRACT, [
                contractAddress,
                data,
                amountVal,
                Number(approved.gasLimit),
                rpcGasPrice,
                senderAddress,
            ]);
            this.rpc.lockWalletAfterCommand(passphrase);
            return result;
        } catch (ex) {
            this.rpc.lockWalletAfterCommand(passphrase);
            throw ex;
        }
    }

    private async signMessage(origin: string, params: any[]) {
        const address = this.requireApproved(origin);
        const [, message] = params;

        await this.prompt.signMessageApproval(origin, message);

        let passphrase = '';
        if (this.wallet.requireUnlock()) {
            [passphrase] = await this.prompt.getPassphrase();
        }

        return this.wallet.signMessage(address, message, passphrase);
    }

    private verifyMessage(params: any[]) {
        const [message, address, signedMessage] = params;
        return this.wallet.verifyMessage(address, message, signedMessage);
    }
}
