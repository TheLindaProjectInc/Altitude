import { Component, ViewChild, ElementRef, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { ElectronService } from 'app/providers/electron.service';
import { DappBridgeService } from '../../providers/dapp-bridge.service';

interface QuickLink {
    name: string;
    url: string;
    ogTitle?: string;
    ogImage?: string;
}

@Component({
    selector: 'app-browser',
    templateUrl: './browser.component.html',
    standalone: false
})
export class BrowserComponent implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild('webviewContainer') webviewContainer: ElementRef;

    // shared across component instances so revisiting /browser doesn't re-fetch every time
    private static readonly ogCache = new Map<string, { ogTitle?: string, ogImage?: string }>();

    public addressInput = '';
    public showHome = true;
    public canGoBack = false;
    public canGoForward = false;

    public quickLinks: QuickLink[] = [
        { name: 'Metrix LGP', url: 'https://metrixlgp.finance' },
        { name: 'Metriverse Exchange', url: 'https://metriverse.exchange' },
        { name: 'Metrix Domains', url: 'https://metrix.domains' },
        { name: 'PyroPets', url: 'https://pyropets.org' },
        { name: 'Arcana', url: 'https://arcana78.dev' },
        { name: 'Metrix DGP', url: 'https://thelindaprojectinc.github.io/Budget-Proposals' },
        { name: 'Metrix.Place', url: 'https://metrix.place' },
    ];

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

    ngOnInit() {
        this.quickLinks.forEach(link => this.loadPreview(link));
    }

    // og:title/og:image previews for the quick-launch tiles. Fetches from the main
    // renderer (not the sandboxed webview), which already runs with webSecurity: false,
    // so cross-origin reads of these public pages aren't blocked by CORS
    private async loadPreview(link: QuickLink) {
        const cached = BrowserComponent.ogCache.get(link.url);
        if (cached) {
            link.ogTitle = cached.ogTitle;
            link.ogImage = cached.ogImage;
            return;
        }
        const result: { ogTitle?: string, ogImage?: string } = {};
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const response = await fetch(link.url, { signal: controller.signal });
            clearTimeout(timeout);
            const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
            result.ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
                || doc.querySelector('title')?.textContent
                || undefined;
            const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
            // og:image is often a relative path - resolve it against the site's own URL
            if (ogImage) {
                try { result.ogImage = new URL(ogImage, link.url).href; } catch (ex) { }
            }
        } catch (ex) {
            // leave result empty - the tile falls back to its icon + name
        }
        BrowserComponent.ogCache.set(link.url, result);
        link.ogTitle = result.ogTitle;
        link.ogImage = result.ogImage;
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
