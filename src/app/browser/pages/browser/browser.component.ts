import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { ElectronService } from 'app/providers/electron.service';
import { DappBridgeService } from '../../providers/dapp-bridge.service';

@Component({
    selector: 'app-browser',
    templateUrl: './browser.component.html',
    standalone: false
})
export class BrowserComponent implements AfterViewInit, OnDestroy {

    @ViewChild('webviewContainer') webviewContainer: ElementRef;

    public addressInput = '';
    public showHome = true;
    public canGoBack = false;
    public canGoForward = false;

    private webviewEl: any;
    private readonly preloadPath: string;

    constructor(
        private electron: ElectronService,
        private dappBridge: DappBridgeService,
    ) {
        const path = window.require('path');
        const { pathToFileURL } = window.require('url');
        this.preloadPath = pathToFileURL(path.join(this.electron.remote.app.getAppPath(), 'dapp-preload.js')).href;
    }

    ngAfterViewInit() {
        // created imperatively (rather than via the template) since <webview> has no
        // hyphen in its tag name, so Angular's template compiler can't be told to
        // treat it as a known/custom element
        this.webviewEl = document.createElement('webview');
        this.webviewEl.classList.add('browser-webview-el');
        // must be set before the webview's first navigation so the guest page
        // never runs without its own isolated, sandboxed context
        this.webviewEl.setAttribute('preload', this.preloadPath);
        this.webviewEl.setAttribute('webpreferences', 'contextIsolation=yes, nodeIntegration=no, sandbox=yes');
        // <webview> silently blocks all popups (target="_blank"/window.open()) unless this
        // is set - without it, our main-process setWindowOpenHandler (lib/dappBridge.ts's
        // setupExternalLinks) never even gets a chance to run, since the click never
        // makes it past the webview's own default block
        this.webviewEl.setAttribute('allowpopups', 'true');
        // Electron's default User-Agent includes an "Electron/x.y.z" token that some
        // CDNs/WAFs (Cloudflare especially) specifically detect and block or misroute -
        // often as an unexplained 404 rather than an obvious 403 - so present as a
        // normal Chrome browser instead. Built from this app's own real UA (rather than
        // hardcoded) so the Chrome/OS version stays accurate as Electron is upgraded
        this.webviewEl.setAttribute('useragent', this.browserUserAgent());
        this.webviewEl.addEventListener('did-navigate', () => this.updateNavState());
        this.webviewEl.addEventListener('did-navigate-in-page', () => this.updateNavState());
        this.webviewContainer.nativeElement.appendChild(this.webviewEl);
        this.dappBridge.registerWebview(this.webviewEl);
    }

    ngOnDestroy() {
        if (this.webviewEl) this.dappBridge.unregisterWebview(this.webviewEl);
    }

    navigate(url: string) {
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        this.addressInput = url;
        this.showHome = false;
        this.webviewEl.src = url;
    }

    goHome() {
        this.showHome = true;
        this.addressInput = '';
    }

    goBack() {
        if (this.webviewEl && this.webviewEl.canGoBack()) this.webviewEl.goBack();
    }

    goForward() {
        if (this.webviewEl && this.webviewEl.canGoForward()) this.webviewEl.goForward();
    }

    reload() {
        if (this.webviewEl) this.webviewEl.reload();
    }

    openDevTools() {
        if (this.webviewEl) this.webviewEl.openDevTools();
    }

    private browserUserAgent(): string {
        return navigator.userAgent
            .split(' ')
            .filter(token => !/^Electron\//i.test(token) && !/altitude/i.test(token))
            .join(' ');
    }

    private updateNavState() {
        if (!this.webviewEl) return;
        this.canGoBack = this.webviewEl.canGoBack();
        this.canGoForward = this.webviewEl.canGoForward();
        this.addressInput = this.webviewEl.getURL();
    }
}
