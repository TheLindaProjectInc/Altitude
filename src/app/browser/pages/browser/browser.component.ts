import { Component, ViewChild, ElementRef, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { ElectronService } from 'app/providers/electron.service';
import { NotificationService } from 'app/providers/notification.service';
import { TranslationService } from 'app/providers/translation.service';
import { ContextMenuService } from 'app/components/context-menu/context-menu.service';
import { ChainType } from 'app/enum';
import { DappBridgeService } from '../../providers/dapp-bridge.service';

type LinkNetwork = 'mainnet' | 'testnet' | 'regtest';

interface QuickLink {
    name: string;
    url: string;
    ogTitle?: string;
    ogImage?: string;
    // user-added (vs. the mandatory Metrix ecosystem links) - only these can be removed
    custom?: boolean;
    // which chain a custom tile targets - lets otherwise-identical mainnet/testnet
    // instances of the same site (same og:title/og:image) be told apart on the tile
    network?: LinkNetwork;
    // transient UI state: tile is flipped showing the remove confirmation face
    confirmRemove?: boolean;
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
    // 'secure' = https with a certificate Chromium accepted, 'insecure' = plain http,
    // 'invalid' = https but the certificate was rejected (expired/self-signed/mismatched
    // hostname/etc.) - detected via the did-fail-load error code, since without a
    // 'certificate-error' handler in the main process (there isn't one) Electron applies
    // Chromium's normal default validation and simply fails the navigation.
    // Note: this can only ever reflect what Chromium itself hard-fails on.
    public secureState: 'secure' | 'insecure' | 'invalid' = 'insecure';

    // mandatory Metrix ecosystem links - always present, never user-removable
    private readonly mandatoryLinks: QuickLink[] = [
        { name: 'Metrix LGP', url: 'https://metrixlgp.finance' },
        { name: 'Metriverse Exchange', url: 'https://metriverse.exchange' },
        { name: 'Metrix Domains', url: 'https://metrix.domains' },
        { name: 'PyroPets', url: 'https://pyropets.org' },
        { name: 'Arcana', url: 'https://arcana78.dev' },
        { name: 'Metrix DGP', url: 'https://thelindaprojectinc.github.io/Budget-Proposals' },
        { name: 'Metrix.Place', url: 'https://metrix.place' },
    ];

    private static readonly CUSTOM_LINKS_KEY = 'BROWSER.CUSTOMLINKS';

    public quickLinks: QuickLink[] = [];

    public readonly networkOptions: { value: LinkNetwork, label: string }[] = [
        { value: 'mainnet', label: 'Mainnet' },
        { value: 'testnet', label: 'Testnet' },
        { value: 'regtest', label: 'Regtest' },
    ];

    public showAddForm = false;
    public newLinkName = '';
    public newLinkUrl = '';
    public newLinkNetwork: LinkNetwork;

    private webviewEl: any;
    private readonly preloadPath: string;

    constructor(
        private electron: ElectronService,
        private dappBridge: DappBridgeService,
        private notification: NotificationService,
        private translation: TranslationService,
        private contextMenu: ContextMenuService,
    ) {
        const path = window.require('path');
        const { pathToFileURL } = window.require('url');
        this.preloadPath = pathToFileURL(path.join(this.electron.remote.app.getAppPath(), 'dapp-preload.js')).href;
        this.newLinkNetwork = this.currentNetworkKey();
    }

    private currentNetworkKey(): LinkNetwork {
        switch (this.electron.chain) {
            case ChainType.TESTNET: return 'testnet';
            case ChainType.REGTEST: return 'regtest';
            default: return 'mainnet';
        }
    }

    // mirrors <text-input>'s own context menu (app/components/textinput) since the
    // address bar is a plain input, not that component (it needs a keyup.enter handler,
    // which text-input doesn't expose)
    onAddressRightClick(event: MouseEvent) {
        const target = event.target as HTMLInputElement;
        target.select();
        const items = [
            {
                name: 'COMPONENTS.TEXTINPUT.CONTEXTMENUCUT',
                func: () => {
                    this.electron.clipboard.writeText(this.addressInput);
                    this.addressInput = '';
                    target.focus();
                }
            },
            {
                name: 'COMPONENTS.TEXTINPUT.CONTEXTMENUCOPY',
                func: () => {
                    this.electron.clipboard.writeText(this.addressInput);
                    target.focus();
                }
            },
            {
                name: 'COMPONENTS.TEXTINPUT.CONTEXTMENUPASTE',
                func: () => {
                    this.addressInput = this.electron.clipboard.readText();
                    target.focus();
                }
            }
        ];
        this.contextMenu.show(event, items);
    }

    // params.x/y turn out to already be relative to the whole BrowserWindow's content
    // view (not the guest page's own viewport) - adding the <webview> element's own
    // getBoundingClientRect() offset on top of that double-counted the sidebar/toolbar
    // position, which is why the menu was rendering well down-and-right of the actual
    // click point (confirmed: the observed offset matched the sidebar width/toolbar
    // height almost exactly)
    private onWebviewContextMenu(event: any) {
        const params = event.params;
        if (!params || !params.editFlags) return;
        // clicking our host-side menu can leave the webview no longer "focused" from
        // Electron's perspective by the time an item's editing command runs - restore
        // focus first so cut/copy/paste/selectAll reliably target the right frame
        const focusWebview = () => this.webviewEl.focus();
        const items = [];
        if (params.editFlags.canCut) {
            items.push({ name: 'COMPONENTS.TEXTINPUT.CONTEXTMENUCUT', func: () => { focusWebview(); this.webviewEl.cut(); } });
        }
        if (params.editFlags.canCopy) {
            items.push({ name: 'COMPONENTS.TEXTINPUT.CONTEXTMENUCOPY', func: () => { focusWebview(); this.webviewEl.copy(); } });
        }
        if (params.editFlags.canPaste) {
            items.push({ name: 'COMPONENTS.TEXTINPUT.CONTEXTMENUPASTE', func: () => { focusWebview(); this.webviewEl.paste(); } });
        }
        if (params.editFlags.canSelectAll) {
            items.push({ name: 'COMPONENTS.TEXTINPUT.CONTEXTMENUSELECTALL', func: () => { focusWebview(); this.webviewEl.selectAll(); } });
        }
        if (!items.length) return;
        this.contextMenu.show({ x: params.x, y: params.y }, items);
    }

    public networkLabel(network: LinkNetwork): string {
        const option = this.networkOptions.find(o => o.value === network);
        return option ? option.label : network;
    }

    ngOnInit() {
        this.quickLinks = [...this.mandatoryLinks, ...this.loadCustomLinks()];
        this.quickLinks.forEach(link => this.loadPreview(link));
    }

    private loadCustomLinks(): QuickLink[] {
        try {
            const raw = localStorage.getItem(BrowserComponent.CUSTOM_LINKS_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter((item: any) => item && typeof item.url === 'string' && typeof item.name === 'string')
                .map((item: any) => ({
                    name: item.name,
                    url: item.url,
                    custom: true,
                    // links saved before the network tag existed default to mainnet
                    network: this.networkOptions.some(o => o.value === item.network) ? item.network : 'mainnet',
                }));
        } catch (ex) {
            return [];
        }
    }

    private saveCustomLinks() {
        const custom = this.quickLinks
            .filter(link => link.custom)
            .map(link => ({ name: link.name, url: link.url, network: link.network }));
        localStorage.setItem(BrowserComponent.CUSTOM_LINKS_KEY, JSON.stringify(custom));
    }

    openAddForm() {
        this.showAddForm = true;
        this.newLinkNetwork = this.currentNetworkKey();
    }

    cancelAddLink(event?: Event) {
        if (event) event.stopPropagation();
        this.showAddForm = false;
        this.newLinkName = '';
        this.newLinkUrl = '';
        this.newLinkNetwork = this.currentNetworkKey();
    }

    saveNewLink(event?: Event) {
        if (event) event.stopPropagation();
        let url = (this.newLinkUrl || '').trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        try {
            url = new URL(url).href;
        } catch (ex) {
            this.notification.notify('error', 'COMPONENTS.BROWSER.LINKINVALID');
            return;
        }
        if (this.quickLinks.some(link => link.url === url)) {
            this.notification.notify('error', 'COMPONENTS.BROWSER.LINKEXISTS');
            return;
        }
        let name = (this.newLinkName || '').trim();
        if (!name) {
            try { name = new URL(url).hostname.replace(/^www\./, ''); } catch (ex) { name = url; }
        }
        const link: QuickLink = { name, url, custom: true, network: this.newLinkNetwork };
        this.quickLinks = [...this.quickLinks, link];
        this.saveCustomLinks();
        this.loadPreview(link);
        this.cancelAddLink();
    }

    startRemove(event: Event, link: QuickLink) {
        event.stopPropagation();
        link.confirmRemove = true;
    }

    cancelRemove(event: Event, link: QuickLink) {
        event.stopPropagation();
        link.confirmRemove = false;
    }

    confirmRemove(event: Event, link: QuickLink) {
        event.stopPropagation();
        this.quickLinks = this.quickLinks.filter(l => l !== link);
        this.saveCustomLinks();
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
        this.webviewEl.addEventListener('did-fail-load', (event: any) => this.handleLoadFailure(event));
        // regular DOM 'contextmenu' events fired inside the guest page's content never
        // reach the host (the guest runs in its own process/frame) - 'context-menu' is
        // the dedicated webview-tag event Electron forwards instead, carrying the same
        // params (incl. editFlags) as the equivalent webContents event
        this.webviewEl.addEventListener('context-menu', (event: any) => this.onWebviewContextMenu(event));
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
        // reset until the navigation actually resolves (success -> updateNavState,
        // certificate failure -> handleLoadFailure) so the old page's padlock doesn't
        // linger while a new one is loading
        this.secureState = 'insecure';
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

    // unlike a regular <iframe>, a failed <webview> navigation (bad host, offline,
    // refused connection, etc.) fails silently in the UI - the only trace is an
    // internal Electron console error, with nothing shown to the user
    private async handleLoadFailure(event: any) {
        // ERR_ABORTED (-3) fires for routine cancellations (e.g. a redirect, or the
        // user navigating elsewhere before a subresource finishes) - not a real failure
        if (!event.isMainFrame || event.errorCode === -3) return;
        // Chromium's net error codes for certificate problems (expired, self-signed,
        // hostname mismatch, revoked, etc.) all fall in the -200 to -299 range
        if (event.errorCode <= -200 && event.errorCode >= -299) this.secureState = 'invalid';
        const prefix = await this.translation.translate('COMPONENTS.BROWSER.LOADFAILED');
        this.notification.notify('error', `${prefix}: ${event.errorDescription || event.errorCode}`, false);
    }

    private browserUserAgent(): string {
        return navigator.userAgent
            .split(' ')
            .filter(token => !/^Electron\//i.test(token) && !/altitude/i.test(token))
            .join(' ');
    }

    public secureStateIcon(): string {
        switch (this.secureState) {
            case 'secure': return 'lock';
            case 'invalid': return 'triangle-exclamation';
            default: return 'lock-open';
        }
    }

    public secureStateTitleKey(): string {
        switch (this.secureState) {
            case 'secure': return 'COMPONENTS.BROWSER.SECURESITE';
            case 'invalid': return 'COMPONENTS.BROWSER.INVALIDCERTSITE';
            default: return 'COMPONENTS.BROWSER.INSECURESITE';
        }
    }

    private updateNavState() {
        if (!this.webviewEl) return;
        this.canGoBack = this.webviewEl.canGoBack();
        this.canGoForward = this.webviewEl.canGoForward();
        this.addressInput = this.webviewEl.getURL();
        // a page only ever reaches did-navigate if Chromium's own certificate validation
        // already accepted it (or it's plain http, which was never validated at all)
        try {
            this.secureState = new URL(this.addressInput).protocol === 'https:' ? 'secure' : 'insecure';
        } catch (ex) {
            this.secureState = 'insecure';
        }
    }
}
