
import { app, ipcMain } from 'electron';
import * as os from 'os';
import * as path from 'path';
import * as request from 'request';
import { spawn, ChildProcess } from 'child_process';
import * as helpers from './helpers';
import * as log from 'electron-log';
import * as settings from './settings';
import * as compareVersions from 'compare-versions';
var localClientBinaries = require('../clientBinaries.json');

const sleep = require('util').promisify(setTimeout)

export default class Client {
    // client details
    clientsLocation = path.join(app.getPath('userData'), 'clients');
    clientName = 'metrixd';
    clientConfigLocation = ''
    clientConfig: ClientConfig;
    clientLocalLocation: string;
    clientDownloadLocation: string;
    clientVersion: string;
    clientVersionHistory = {};
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
    // when using hash of unknown daemon assume version
    readonly assumeClientVersion = '3.4.0.0';

    constructor(win) {
        this.win = win;
        this.setupListeners();
        this.getClientConfigLocation();
        this.startClient();
    }

    getClientConfigLocation() {
        const confName = 'metrix.conf';
        const dataDir = 'metrix';
        if (os.platform() === 'win32') {
            this.clientConfigLocation = path.join(app.getPath('userData'), '../', dataDir, confName);
        } else if (os.platform() === 'linux') {
            this.clientConfigLocation = path.join(app.getPath('home'), '.' + dataDir, confName);
        } else if (os.platform() === 'darwin') {
            this.clientConfigLocation = path.join(app.getPath('home'), 'Library', 'Application Support', dataDir, confName);
        }
        // check if we passed a custom data dir
        for (let i = 0; i < process.argv.length; i++) {
            let arg = process.argv[i];
            if (arg.toLowerCase().indexOf('-datadir=') > -1) {
                this.clientConfigLocation = path.join(arg.split("=")[1].trim(), confName);
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
            if (await this.getClientConfig()) {
                log.info("Client", "Config exists");
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
            }
            // if we don't already have a local client download it
            log.info("Client", "Check client exists", this.clientLocalLocation);
            if (!await helpers.pathExists(this.clientLocalLocation)) {
                // check if we need to make the directory
                if (!await helpers.pathExists(this.clientsLocation))
                    await helpers.makeFolder(this.clientsLocation);

                if (!await this.downloadClient()) return
            } else {
                // if we have a client check for an update
                log.info("Client", "Client exists. Checking for update");
                const localHash = await helpers.getFileHash(this.clientLocalLocation);
                if (localHash !== this.clientConfig.download.sha256) {
                    log.info("Client", "Update available");
                    // check if we should skip this update
                    if (update || settings.getSettings().skipCoreUpdate !== this.clientConfig.download.sha256) {
                        if (update) {
                            if (!await this.downloadClient()) return
                        } else {
                            // wait here for response on update or not
                            this.setClientStatus(ClientStatus.UPDATEAVAILABLE);
                            if (await this.waitForUpdateResponse()) {
                                if (!await this.downloadClient()) return
                            }
                            else log.info("Client", "Skipping Update");
                        }
                    }
                    else log.info("Client", "Skipping Update");
                }
            }
            // run the client
            this.setClientStatus(ClientStatus.STARTING);
            log.info("Client", "Running client");
            this.runClient(this.clientConfig.bin, commands);
            await this.waitForCredentials();
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
                clientBinaries = JSON.parse(res.body);
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
            log.info("Client", "Deleting old client");
            await helpers.deleteFile(this.clientDownloadLocation);
            log.info("Client", "Downloading client");
            const fileHash = await helpers.downloadFile(this.clientConfig.download.url, this.clientDownloadLocation);
            if (fileHash != this.clientConfig.download.sha256) {
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
            this.setClientStatus(ClientStatus.DOWNLOADFAILED);
            return false;
        }
    }

    async waitForCredentials() {
        if (this.status === ClientStatus.SHUTTINGDOWN || this.status === ClientStatus.RESTARTING || this.status === ClientStatus.CLOSEDUNEXPECTED)
            return;
        if (await this.getClientConfig()) {
            log.info("Client", "Config exists");
            // check we got credentials
            if (!this.clientConfigFile.rpcuser || !this.clientConfigFile.rpcpassword || !this.clientConfigFile.rpcport) {
                log.info("Client", "Couldn't get credentials from config");
                this.setClientStatus(ClientStatus.NOCREDENTIALS);
            } else {
                // set status as running
                this.setClientStatus(ClientStatus.RUNNING);
            }
        } else {
            log.info("Client", "Config doesn't exist. Checking in 1000ms");
            await sleep(1000);
            return this.waitForCredentials();
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

        const res: any = await this.callClient('getinfo');
        this.rpcMessage = "";

        if (!res.success) {
            try {
                if (res.body.error.code === -28) this.rpcMessage = res.body.error.message;
            } catch (ex) {
                //error isn't formed as expected
            }
            this.rpcRunning = false;
            this.sendRPCStatus();
            log.info("Client", "RPC not ready. retrying in 1000ms", this.rpcMessage);
            await sleep(1000);
            return this.waitForClientReady();
        } else {
            this.clientVersion = res.body.result.version.replace("-g", "").replace("v", "");
            this.sendClientVersion();
            this.rpcRunning = true;
            this.sendRPCStatus();
            log.info("Client", "RPC Ready");
        }
    }

    runClient(bin, startupCommands = []) {
        // check for invalid masternode setup
        if (!this.clientConfigFile.hasValidMasternodeSetup) {
            log.error("Client", "Invalid masternode configuration. Please check your metrix.conf file");
            this.setClientStatus(ClientStatus.INVALIDMASTERNODECONFIG);
            return;
        }
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
        if (appSettings.tor) {
            // Metrix Core 3.3 renames tor startup command to onion
            if (compareVersions(this.clientVersion, '3.3.0.0') >= 0)
                startupCommands.push('-tor=' + appSettings.tor)
            else
                startupCommands.push('-onion=' + appSettings.tor)
        }
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

    destroyClientProccess() {
        this.setClientStatus(ClientStatus.STOPPED);
        if (this.proc) this.proc.removeAllListeners()
        this.proc = null;
    }

    async getClientConfig() {
        try {
            this.clientConfigFile = new ClientConfigFile();
            if (await helpers.pathExists(this.clientConfigLocation)) {
                let data = await helpers.readFile(this.clientConfigLocation) as string;
                let lines = data.split(os.EOL);
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].indexOf('=') > -1) {
                        lines[i] = lines[i].replace('\r', '').replace('\n', '');
                        const key = lines[i].split("=")[0].trim();
                        const val = lines[i].split("=")[1].trim();

                        if (key === 'addnode') this.clientConfigFile.nodes.push(val)
                        else this.clientConfigFile[key] = val
                    }
                }
                return true;
            }
        } catch (ex) {
            // if we fail to read the config file
        }
        return false;
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
                if (error || body.error) {
                    // check if client has stopped
                    if (this.status === ClientStatus.RUNNINGEXTERNAL && error && error.code === "ECONNREFUSED") {
                        this.setClientStatus(ClientStatus.STOPPED)
                    }
                    resolve({ success: false, body, error });
                }
                else resolve({ success: true, body });
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
            status === ClientStatus.CLOSEDUNEXPECTED) {
            this.rpcRunning = false;
            this.sendRPCStatus();
        }
    }

    sendRPCStatus() {
        if (this.win) this.win.webContents.send('client-node', 'RPC', { ready: this.rpcRunning, message: this.rpcMessage });
    }

    sendClientVersion() {
        if (this.win) this.win.webContents.send('client-node', 'VERSION', this.clientVersion);
    }

    async checkClientUpdate() {
        try {
            await this.getClientBinaries(false);
            const localHash = await helpers.getFileHash(this.clientLocalLocation);
            const hasUpdate = localHash !== this.clientConfig.download.sha256;
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
        }
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
    NOCREDENTIALS,
    INVALIDHASH,
    INVALIDMASTERNODECONFIG,
    DOWNLOADFAILED,
    UNSUPPORTEDPLATFORM,
    SHUTTINGDOWN,
    RESTARTING,
    CLOSEDUNEXPECTED,
}

class ClientConfig {
    download: {
        url: string,
        sha256: string,
    }
    bin: string
}

class ClientConfigFile {
    daemon: string;
    server: string;
    rpcallowip: string = '127.0.0.1';
    rpcport: string;
    rpcuser: string;
    rpcpassword: string;
    masternode: string;
    masternodeprivkey: string;
    masternodeaddr: string;
    nodes: Array<string> = [];


    get hasRPCDetails(): boolean {
        if (!this.rpcuser || !this.rpcpassword || !this.rpcport) return false;
        return true;
    }

    get hasValidMasternodeSetup(): boolean {
        if (!this.masternode) return true;
        if (this.masternode === '1' && (this.masternodeprivkey || this.masternodeaddr)) return true;
        return false;
    }
}