
import { app, ipcMain, shell, clipboard } from 'electron';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as request from 'request';
import { spawn, ChildProcess } from 'child_process';
import * as log from 'electron-log';
import * as unzipper from 'unzipper'
import * as compareVersions from 'compare-versions';
import * as publicIp from 'public-ip';
import * as settings from './settings';
import * as helpers from './helpers';
var localClientBinaries = require('../clientBinaries.json');

const sleep = require('util').promisify(setTimeout)

export default class Client {
    // client details
    clientsLocation = path.join(app.getPath('userData'), 'clients');
    clientName = 'metrixcoind';
    clientConfigLocation = ''
    clientDataDir = '';
    clientConfig: ClientConfig;
    clientLocalLocation: string;
    clientDownloadLocation: string;
    clientVersion: string;
    clientVersionHistory = {};
    clientBootstrapUrl: string
    // client config file
    clientConfigFile: ClientConfigFile;
    // rpc status
    rpcRunning = false;
    rpcMessage = "";
    // client node process
    proc: ChildProcess;
    // electron window
    win: any;
    // user response when client update available
    updateResponse;
    // client status
    status: ClientStatus = ClientStatus.INITIALISING;
    // chain we are running on
    chain: ChainType = ChainType.MAINNET;
    // when using hash of unknown daemon assume version
    readonly assumeClientVersion = '4.0.0.0';

    constructor(win) {
        this.win = win;
        this.setupListeners();
        this.getClientConfigLocation();
        this.startClient();
    }

    getClientConfigLocation() {
        const confName = 'metrix.conf';
        const dataDir = 'metrixcoin';
        if (os.platform() === 'win32') {
            this.clientDataDir = path.join(app.getPath('userData'), '../', dataDir);
        } else if (os.platform() === 'linux') {
            this.clientDataDir = path.join(app.getPath('home'), '.' + dataDir);
        } else if (os.platform() === 'darwin') {
            this.clientDataDir = path.join(app.getPath('home'), 'Library', 'Application Support', dataDir);
        }
        // check if we passed a custom data dir
        for (let i = 0; i < process.argv.length; i++) {
            let arg = process.argv[i];
            if (arg.toLowerCase().indexOf('-datadir=') > -1) {
                this.clientDataDir = arg.split("=")[1].trim();
                break;
            }
        }
        this.clientConfigLocation = path.join(this.clientDataDir, confName);
        // check if we passed a custom conf file
        for (let i = 0; i < process.argv.length; i++) {
            let arg = process.argv[i];
            if (arg.toLowerCase().indexOf('-conf=') > -1) {
                this.clientConfigLocation = arg.split("=")[1].trim();
                break;
            }
        }
        log.info('Client', 'Config location', this.clientConfigLocation);
    }

    setupListeners() {
        ipcMain.on('client-node', (event, cmd, data) => {
            log.debug('Received IPC:client-node', cmd, data);
            switch (cmd) {
                case 'STATUS':
                    this.setClientStatus(this.status);
                    break;
                case 'RPC':
                    this.sendRPCStatus();
                    break;
                case 'RESTART':
                    this.stop(false).then(() => this.startClient(true, false, data));
                    break;
                case 'CHECKUPDATE':
                    this.checkClientUpdate();
                    break;
                case 'APPLYUPDATE':
                    this.stop(false).then(() => this.startClient(true, true, data));
                    break;
                case 'UPDATE':
                    if (this.updateResponse) this.updateResponse(true);
                    break;
                case 'NOUPDATE':
                    if (data === true) settings.set_skipCoreUpdate(this.clientConfig.download.sha256); // skip this update
                    if (this.updateResponse) this.updateResponse(false);
                    break;
                case 'CALLCLIENT':
                    this.callClient(data.method, data.params).then(result => {
                        this.IPC_sendCallClientResponse(data.callId, data.method, result);
                    })
                    break;
                case 'VERSION':
                    this.sendClientVersion();
                    break;
                case 'CHAIN':
                    this.sendChainType();
                    break;
                case 'SETCHAIN':
                    this.setChainType(data);
                    break;
                case 'IP':
                    this.sendPublicIP();
                    break;
                case 'BOOTSTRAP':
                    this.bootstrapClient();
                    break;
                case 'RESYNC':
                    this.resyncClient();
                    break;
                case 'REINSTALL':
                    this.reinstallClient();
                    break;
                case 'REPORTISSUE':
                    this.reportIssue(data);
                    break;

            }
        });
    }

    IPC_sendCallClientResponse(callId: string, method: string, result: any) {
        if (this.win) this.win.webContents.send('client-node', 'CALLCLIENT', { callId, method, result });
    }

    async startClient(restart = false, update = false, commands = []) {
        try {
            this.setClientStatus(ClientStatus.INITIALISING);
            // get the client info
            await this.getClientBinaries(restart);
            // load config
            this.setClientStatus(ClientStatus.CHECKEXISTS);
            await this.getClientConfig()
            // check we got credentials
            if (!this.clientConfigFile.hasRPCDetails) {
                log.info("Client", "Couldn't get credentials from config");
                this.setClientStatus(ClientStatus.NOCREDENTIALS);
                return;
            }
            // if already running exit here
            log.info("Client", "Check if already running");
            if ((await this.callClient('help') as any).success) {
                log.info("Client", "Client is already running");
                if (this.proc) this.setClientStatus(ClientStatus.RUNNING);
                else this.setClientStatus(ClientStatus.RUNNINGEXTERNAL);
                await this.waitForClientReady();
                return;
            }
            // if we don't already have a local client download it
            log.info("Client", "Check client exists", this.clientLocalLocation);
            if (!await helpers.pathExists(this.clientLocalLocation)) {
                if (!await this.downloadClient()) return
            } else {
                // if we have a client check for an update
                log.info("Client", "Client exists. Checking for update");
                const localHash = await helpers.getFileHash(this.clientLocalLocation);
                if (localHash !== this.clientConfig.download.sha256.toUpperCase()) {
                    log.info("Client", "Update available");
                    // check if we should skip this update
                    if (update || settings.getSettings().skipCoreUpdate !== this.clientConfig.download.sha256.toUpperCase()) {
                        if (update) {
                            if (!await this.downloadClient()) return
                        } else {
                            // wait here for response on update or not
                            this.setClientStatus(ClientStatus.UPDATEAVAILABLE);
                            if (await this.waitForUpdateResponse()) {
                                if (!await this.downloadClient()) return
                            } else {
                                log.info("Client", "Skipping Update");
                            }
                        }
                    } else {
                        log.info("Client", "Skipping Update");
                    }
                }
            }
            // run the client
            this.setClientStatus(ClientStatus.STARTING);
            log.info("Client", "Running client");
            this.runClient(this.clientConfig.bin, commands);
            this.setClientStatus(ClientStatus.RUNNING);
            await this.waitForClientReady();
        } catch (ex) {
            log.error("Client", "Start error", ex);
            this.setClientStatus(ex)
        }
        return;
    }

    async getClientBinaries(restart) {
        const arch = os.arch();
        const platform = os.platform();
        log.info("Client", "Running on platform", platform, arch);
        // load local client binaries
        let clientBinaries = localClientBinaries;
        // try to get remote file for updates. Skip this if we are restarted the client
        if (!restart) {
            try {
                const res: any = await helpers.getRequest("https://raw.githubusercontent.com/thelindaprojectinc/altitude/master/clientBinaries.json");
                let remoteClientBinaries = JSON.parse(res.body);
                if (compareVersions(remoteClientBinaries[this.clientName].version, clientBinaries[this.clientName].version) > 0) {
                    clientBinaries = remoteClientBinaries;
                    log.info("Client", "Using remote client binaries");
                }
            } catch (ex) {
                log.info("Client", "Failed to get remote client binaries, using local");
            }
        }
        // check we support this platform
        if (!clientBinaries[this.clientName][platform] || !clientBinaries[this.clientName][platform][arch]) {
            log.info("Client", "Unsupported platform", platform, arch);
            throw ClientStatus.UNSUPPORTEDPLATFORM
        }
        // set client details
        this.clientConfig = clientBinaries[this.clientName][platform][arch];
        this.clientLocalLocation = path.join(this.clientsLocation, this.clientConfig.bin);
        this.clientDownloadLocation = path.join(this.clientsLocation, 'download');
        this.clientVersionHistory = clientBinaries[this.clientName].versions;
        this.clientBootstrapUrl = clientBinaries[this.clientName].bootstrap;
        // get client version
        await this.getClientVersion();
    }

    async waitForUpdateResponse() {
        return new Promise((resolve, reject) => {
            this.updateResponse = resolve;
        })
    }

    async downloadClient() {
        try {
            this.setClientStatus(ClientStatus.DOWNLOADCLIENT);
            // check if we need to make the directories
            await helpers.ensureDirectoryExists(this.clientsLocation);
            log.info("Client", "Deleting old client");
            await helpers.deleteFile(this.clientDownloadLocation);
            await helpers.deleteFile(this.clientLocalLocation);
            log.info("Client", "Downloading client", this.clientConfig.download.url);
            const fileHash = await helpers.downloadFile(this.clientConfig.download.url, this.clientDownloadLocation);
            log.info("Client", "Downloaded client hash", fileHash);
            if (fileHash != this.clientConfig.download.sha256.toUpperCase()) {
                log.info("Client", "Invalid SHA256");
                this.setClientStatus(ClientStatus.INVALIDHASH);
                return false;
            } else {
                await helpers.renameFile(this.clientDownloadLocation, this.clientLocalLocation);
                if (os.platform() !== 'win32') await helpers.setFileExecutable(this.clientLocalLocation);
                await this.getClientVersion();
            }
            return true;
        } catch (ex) {
            log.error("Client", "Download error", ex);
            this.setClientStatus(ClientStatus.DOWNLOADFAILED);
            return false;
        }
    }

    async waitForClientReady(): Promise<void> {
        // check if we interrupted the startup
        if (this.status === ClientStatus.SHUTTINGDOWN || this.status === ClientStatus.RESTARTING || this.status === ClientStatus.CLOSEDUNEXPECTED) {
            this.rpcMessage = "";
            this.rpcRunning = false;
            this.sendRPCStatus();
            return;
        }

        const res: any = await this.callClient('getnetworkinfo');
        this.rpcMessage = "";

        if (!res.success) {
            try {
                if (res.body.error.code === -28) this.rpcMessage = res.body.error.message;
            } catch (ex) {
                //error isn't formed as expected
            }
            this.rpcRunning = false;
            this.sendRPCStatus();
            if (res.code !== 401) {
                log.info("Client", "RPC not ready. retrying in 1000ms", this.rpcMessage);
                await sleep(1000);
                return this.waitForClientReady();
            }
        } else {
            this.clientVersion = this.parseVersion(res.body.result.version);
            this.sendClientVersion();
            this.sendChainType();
            this.rpcRunning = true;
            this.sendRPCStatus();
            log.info("Client", "RPC Ready");
        }
    }

    parseVersion(version: number): string {
        const versionString = version.toString()
        const major = Number(versionString.substring(0, versionString.length - 6))
        const minor = Number(versionString.substring(1, versionString.length - 4))
        const rev = Number(versionString.substring(3, versionString.length - 2))
        const build = Number(versionString.substring(5, versionString.length))
        return `${major}.${minor}.${rev}.${build}`
    }

    runClient(bin, startupCommands = []) {
        // check for startup commands
        if (app.isPackaged && process.argv.length > 1)
            startupCommands = startupCommands.concat(process.argv.slice(1, process.argv.length));
        const appSettings = settings.getSettings();
        if (appSettings.blockIncomingConnections) startupCommands.push('-listen=0')
        if (appSettings.onlynet) {
            let nets = appSettings.onlynet.split(",");
            nets.forEach(net => startupCommands.push('-onlynet=' + net))
        }
        if (appSettings.proxy) startupCommands.push('-proxy=' + appSettings.proxy)
        if (appSettings.tor) startupCommands.push('-tor=' + appSettings.tor)
        // set network
        if (this.chain === ChainType.TESTNET) startupCommands.push('-testnet');
        if (this.chain === ChainType.REGTEST) startupCommands.push('-regtest');
        startupCommands.push('-printtoconsole=0')
        startupCommands = startupCommands.filter(e => e[1] !== '-') // don't send electron specific flags to daemon
        log.info("Client", "Running with commands", startupCommands);

        // start client
        this.proc = spawn(path.join(this.clientsLocation, bin), startupCommands);
        // listen for unexpected close
        this.proc.once('close', () => {
            if (
                this.proc &&
                this.status !== ClientStatus.SHUTTINGDOWN &&
                this.status !== ClientStatus.RESTARTING &&
                this.status !== ClientStatus.STOPPED
            ) {
                log.info("Client", "closed unexpectedly status:", this.status);
                this.destroyClientProccess();
                this.setClientStatus(ClientStatus.CLOSEDUNEXPECTED);
            }
        });
    }

    public stop(shuttingDown = true) {
        // set client status to stopping
        if (shuttingDown) this.setClientStatus(ClientStatus.SHUTTINGDOWN);
        else this.setClientStatus(ClientStatus.RESTARTING);

        return new Promise((resolve, reject) => {
            if (this.proc) {
                log.info("Client", "Kill client");
                // setup force kill function
                const forceKill = () => {
                    if (this.proc) {
                        log.info("Client", "failed to exit gracefully. force killing.");
                        this.proc.kill();
                    }
                    this.destroyClientProccess();
                    resolve();
                }
                // attempt to gracefully exit
                this.callClient('stop').then(success => {
                    if (!success) forceKill()
                });
                // force close if we fail to exit gracefully
                let killTimeout = setTimeout(forceKill, 10000);
                // if we hear the close cancel force kill and notify app
                this.proc.once('close', () => {
                    clearTimeout(killTimeout);
                    this.destroyClientProccess();
                    resolve();
                });
            } else {
                resolve();
            }
        })
    }

    async bootstrapClient() {
        try {
            const bootstrapLocation = path.join(this.clientDataDir, 'bootstrap.zip');
            log.info("Client", "Bootstrap stopping client...");
            await this.stop();
            this.setClientStatus(ClientStatus.BOOTSTRAPPING);
            log.info("Client", "Bootstrap downloading files...", this.clientBootstrapUrl);
            await helpers.deleteFile(bootstrapLocation);
            await helpers.downloadFile(this.clientBootstrapUrl, bootstrapLocation);
            log.info("Client", "Bootstrap removing old files...");
            helpers.deleteFolderSync(path.join(this.clientDataDir, "blocks"));
            helpers.deleteFolderSync(path.join(this.clientDataDir, "chainstate"));
            log.info("Client", "Bootstrap copying bootstrap...");
            fs.createReadStream(bootstrapLocation)
                .pipe(unzipper.Extract({ path: this.clientDataDir }))
                .on('entry', entry => entry.autodrain())
                .promise()
                .then(() => {
                    helpers.deleteFile(bootstrapLocation);
                    log.info("Client", "Bootstrap starting client...");
                    this.startClient(true, true);
                }, err => { throw err });
        } catch (ex) {
            log.error("Client", "Bootstrap failed", ex);
            this.setClientStatus(ClientStatus.BOOTSTRAPFAILED);
        }
    }

    async reinstallClient() {
        log.info("Client", "Reinstall stopping client...");
        await this.stop();
        log.info("Client", "Reinstall get client binaries...");
        await this.getClientBinaries(false);
        if (await this.downloadClient()) {
            log.info("Client", "Reinstall starting client...");
            this.startClient(true, true);
        }
    }

    async resyncClient() {
        log.info("Client", "Resync stopping client...");
        await this.stop();
        log.info("Client", "Resync removing local blockchain files...");
        helpers.deleteFolderSync(path.join(this.clientDataDir, "blocks"));
        helpers.deleteFolderSync(path.join(this.clientDataDir, "chainstate"));
        log.info("Client", "Resync starting client...");
        this.startClient(true, true);
    }

    destroyClientProccess() {
        this.setClientStatus(ClientStatus.STOPPED);
        if (this.proc) this.proc.removeAllListeners()
        this.proc = null;
    }

    async getClientConfig() {
        this.clientConfigFile = new ClientConfigFile(this.chain);
        try {
            if (await helpers.pathExists(this.clientConfigLocation)) {
                let data = await helpers.readFile(this.clientConfigLocation) as string;
                let lines = data.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].indexOf('=') > -1) {
                        lines[i] = lines[i].replace('\r', '').replace('\n', '');
                        const key = lines[i].split("=")[0].trim();
                        const val = lines[i].split("=")[1].trim();

                        if (key === 'addnode') this.clientConfigFile.nodes.push(val)
                        else this.clientConfigFile[key] = val
                    }
                }
                return;
            }
        } catch (ex) {
            // if we fail to read the config file
        }
        // write a new one if none exists
        await this.writeClientConfig()
    }

    async writeClientConfig() {
        try {
            let data = '';
            // write keys
            Object.keys(this.clientConfigFile).forEach(key => {
                if (key !== 'nodes' && key !== 'rpcport' && this.clientConfigFile[key].toString() !== '')
                    data += `${key}=${this.clientConfigFile[key]}${os.EOL}`;
            })
            // write any addnode
            this.clientConfigFile.nodes.forEach(node => {
                data += `addnode=${node}${os.EOL}`;
            })
            // write file
            await helpers.writeFile(this.clientConfigLocation, data);
            return true;
        } catch (ex) {
            // failed to write file. probably a permission issue
        }
        return false
    }

    async callClient(method, params = []): Promise<{}> {
        return new Promise((resolve, reject) => {
            let timeout = method === 'importprivkey' ? 60000 : 10000
            const options = {
                method: 'POST',
                url: `http://${this.clientConfigFile.rpcuser}:${this.clientConfigFile.rpcpassword}@127.0.0.1:${this.clientConfigFile.rpcport}/`,
                body: { jsonrpc: '1.0', id: 'Tunnel', method: method, params: params },
                json: true,
                timeout: timeout
            };

            request(options, (error, response, body) => {
                const result = { success: false, code: response ? response.statusCode : null, body, error }
                if (error || (body && body.error)) {
                    // check if client has stopped
                    if (this.status === ClientStatus.RUNNINGEXTERNAL && error && error.code === "ECONNREFUSED") {
                        this.setClientStatus(ClientStatus.STOPPED)
                    }
                } else if (result.code !== 401) {
                    result.success = true
                } else {
                    this.setClientStatus(ClientStatus.UNKNOWNERROR)
                }
                resolve(result)
            });
        })
    }

    setClientStatus(status: ClientStatus) {
        log.info('Client', 'Status', status);
        this.status = status;
        if (this.win) this.win.webContents.send('client-node', 'STATUS', this.status);
        // check if RPC has stopped
        if (status === ClientStatus.STOPPED ||
            status === ClientStatus.SHUTTINGDOWN ||
            status === ClientStatus.RESTARTING ||
            status === ClientStatus.CLOSEDUNEXPECTED ||
            status === ClientStatus.UNKNOWNERROR) {
            this.rpcRunning = false;
            this.sendRPCStatus();
        }
    }

    async setChainType(chain: ChainType) {
        if (chain !== this.chain) {
            this.chain = chain
            await this.stop(false)
            this.startClient(true)
        }
    }

    sendRPCStatus() {
        if (this.win) this.win.webContents.send('client-node', 'RPC', { ready: this.rpcRunning, message: this.rpcMessage });
    }

    sendClientVersion() {
        if (this.win) this.win.webContents.send('client-node', 'VERSION', this.clientVersion);
    }

    sendChainType() {
        if (this.win) this.win.webContents.send('client-node', 'CHAIN', this.chain);
    }

    async sendPublicIP() {
        if (this.win) this.win.webContents.send('client-node', 'IP', await publicIp.v4());
    }

    async checkClientUpdate() {
        try {
            await this.getClientBinaries(false);
            const localHash = await helpers.getFileHash(this.clientLocalLocation);
            const hasUpdate = localHash !== this.clientConfig.download.sha256.toUpperCase();
            if (this.win) this.win.webContents.send('client-node', 'CHECKUPDATE', hasUpdate);
        } catch (ex) {
        }
        return;
    }

    async getClientVersion() {
        if (await helpers.pathExists(this.clientLocalLocation)) {
            const fileHash = await helpers.getFileHash(this.clientLocalLocation) as string;
            if (this.clientVersionHistory) {
                Object.keys(this.clientVersionHistory).forEach(key => {
                    if (!this.clientVersion && this.clientVersionHistory[key].indexOf(fileHash) > -1)
                        this.clientVersion = key;
                })
            }
            if (!this.clientVersion) {
                this.clientVersion = this.assumeClientVersion;
                log.info('Client', 'Unknown version. Assuming', this.clientVersion);
            } else {
                log.info('Client', 'Client Version', this.clientVersion);
            }
            this.sendClientVersion();
            this.sendChainType();
        }
    }

    async reportIssue(data) {
        let logLink = '';
        try {
            let mainLogLocation = path.join(app.getPath('userData'), 'logs', 'main.log');
            let rendererLogLocation = path.join(app.getPath('userData'), 'logs', 'renderer.log');
            let logData = '';
            // read in main log
            if (await helpers.pathExists(mainLogLocation)) {
                logData += "----- MAIN -----\n\n" + await helpers.readFile(mainLogLocation)
            }
            // read in main log
            if (await helpers.pathExists(rendererLogLocation)) {
                logData += "----- RENDERER -----\n\n" + await helpers.readFile(rendererLogLocation)
            }
            // upload log
            const options = {
                method: 'POST',
                url: `https://file.io/`,
                form: { text: logData }
            };

            logLink = await new Promise((resolve, reject) => {
                request(options, (error, response, body) => {
                    if (error) {
                        reject(error)
                    } else {
                        let json = JSON.parse(body)
                        if (json.success) resolve(json.link)
                        else reject(json)
                    }
                });
            })
        } catch (ex) {
            logLink = ex;
            log.error("Client", "Report issue failed", ex);
        }

        const baseUrl = 'https://github.com/TheLindaProjectInc/Altitude/issues/new?body=';
        let body = 'Description of issue: Please describe the issue with as much information as possible\n\n' +
            'Machine: ' + os.arch() + ' ' + os.platform() + '\n' +
            'Altitude: ' + app.getVersion() + '\n' +
            'Metrix Core: ' + data.core + '\n' +
            'Connections: ' + data.connections + '\n' +
            'Blocks: ' + data.blocks + '\n' +
            'Log: ' + logLink
        clipboard.writeText(body);
        shell.openExternal(baseUrl + encodeURI(body))
    }

    destroy() {
        this.win = null;
    }

}

export enum ClientStatus {
    INITIALISING,
    CHECKEXISTS,
    DOWNLOADCLIENT,
    UPDATEAVAILABLE,
    STARTING,
    RUNNING,
    RUNNINGEXTERNAL,
    STOPPED,
    BOOTSTRAPPING,
    NOCREDENTIALS,
    INVALIDHASH,
    DOWNLOADFAILED,
    UNSUPPORTEDPLATFORM,
    SHUTTINGDOWN,
    RESTARTING,
    CLOSEDUNEXPECTED,
    BOOTSTRAPFAILED,
    UNKNOWNERROR
}

export enum ChainType {
    MAINNET,
    TESTNET,
    REGTEST
}

class ClientConfig {
    download: {
        url: string,
        sha256: string,
    }
    bin: string
}

class ClientConfigFile {
    server: string = '1'
    rpcallowip: string = '127.0.0.1';
    rpcport: string;
    rpcuser: string;
    rpcpassword: string;
    nodes: Array<string> = [];

    constructor(chain: ChainType) {
        this.setRPCPort(chain)
        this.generateCredentials()
    }

    public setRPCPort(chain: ChainType) {
        if (chain === ChainType.MAINNET) {
            this.rpcport = '33831';
        } else if (chain === ChainType.TESTNET) {
            this.rpcport = '33841';
        } else if (chain === ChainType.REGTEST) {
            this.rpcport = '33851';
        }
    }

    public generateCredentials() {
        this.rpcuser = this.generateString(10)
        this.rpcpassword = this.generateString(20)
    }

    get hasRPCDetails(): boolean {
        if (!this.rpcuser || !this.rpcpassword) return false;
        return true;
    }

    private generateString(length) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

}