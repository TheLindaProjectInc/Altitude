import { ipcRenderer, webFrame } from 'electron';

// confirmed against MetriMask's own src/constants.ts (TARGET_NAME, API_TYPE,
// METRIMASK_ACCOUNT_CHANGE) rather than inferred from dApp behavior
const BRIDGE_CHANNEL = 'metrimask-bridge';
const INPAGE_TARGET = 'metrimask-inpage';
const CONTENTSCRIPT_TARGET = 'metrimask-contentscript';
const INTERNAL_TARGET = 'metrimask-preload-internal';

const CONNECT_TRIGGER = 'CONNECT_METRIMASK';

const REASON = {
  DAPP_CONNECTION: 'Account Connected to Dapp',
  LOGOUT: 'Account Logged Out',
  BALANCE_CHANGE: 'MRX Account Balance Changed',
};

let requestSeq = 0;
const pending = new Map<string, { resolve: (value: any) => void, reject: (reason: any) => void }>();

// matches the real extension: window.metrimask.account is null until a site
// connects and an account is available, not a "loggedIn: false" placeholder object
let account: any = null;

// logged so any future "account went null unexpectedly" report can be traced to the
// exact call site/reason instead of guessed at from the outside
function setAccount(value: any, reason: string) {
  // eslint-disable-next-line no-console
  console.log(`[metrimask-preload] account -> ${value ? value.address : 'null'} (${reason})`, new Error().stack);
  account = value;
  // window.metrimask.account is a plain property on the page-owned object injected
  // below (not exposed via contextBridge) - see the injection block for why, so this
  // is a normal, unrestricted mutation that the page sees immediately
  webFrame.executeJavaScript(
    `window.metrimask && (window.metrimask.account = ${JSON.stringify(value)});`
  ).catch(() => { });
}

function send(type: string, method: string | null, params: any[]) {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${++requestSeq}`;
    pending.set(id, { resolve, reject });
    ipcRenderer.sendToHost(BRIDGE_CHANNEL, { id, type, method, params });
  });
}

// dispatched in the same shape MetriMask's own README documents for dApps that
// listen to the raw message bus directly instead of (or in addition to) awaiting
// the rpcProvider promises: { data: { target: 'metrimask-inpage', message: { type, payload } } }
function postToPage(type: string, payload: any, target: string = INPAGE_TARGET) {
  window.postMessage({ target, message: { type, payload } }, '*');
}

function announceAccount(payload: any, reason: string) {
  postToPage('METRIMASK_ACCOUNT_CHANGED', { ...payload, statusChangeReason: reason });
}

ipcRenderer.on(BRIDGE_CHANNEL, (_event, payload) => {
  // eslint-disable-next-line no-console
  console.log('[metrimask-preload] received reply from host', payload);
  if (payload && payload.event === 'ACCOUNT_CHANGED') {
    setAccount(payload.account || null, 'pushed ACCOUNT_CHANGED');
    announceAccount({ account, error: payload.error }, account ? REASON.BALANCE_CHANGE : REASON.LOGOUT);
    return;
  }
  const { id, type, result, error } = payload || {};
  const waiting = id && pending.get(id);
  if (!waiting) return;
  pending.delete(id);
  if (type === 'CONNECT') {
    setAccount((result && result.loggedIn) ? result : null, `CONNECT reply (loggedIn=${result && result.loggedIn})`);
    announceAccount({ account, error }, account ? REASON.DAPP_CONNECTION : REASON.LOGOUT);
  } else {
    postToPage('RPC_RESPONSE', { id, result, error });
  }
  if (error) waiting.reject(error);
  else waiting.resolve(result);
});

let connectPromise: Promise<any> | null = null;
function requestConnect() {
  if (!connectPromise) {
    connectPromise = send('CONNECT', null, []).finally(() => { connectPromise = null; });
  }
  return connectPromise;
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data: any = event.data;

  if (data && data.target === INTERNAL_TARGET && data.kind === 'request') {
    send('RAWCALL', data.method, data.params || [])
      .then(result => window.postMessage({ target: INTERNAL_TARGET, kind: 'response', reqId: data.reqId, result }, '*'))
      .catch(error => window.postMessage({ target: INTERNAL_TARGET, kind: 'response', reqId: data.reqId, error: (error && error.toString()) || String(error) }, '*'));
    return;
  }

  const message = data && data.message;
  if (message && message.type === CONNECT_TRIGGER) {
    // eslint-disable-next-line no-console
    console.log('[metrimask-preload] connect trigger received, requesting connect');
    // the real extension acknowledges the connect trigger immediately (before the
    // actual account data, which can take a while since it waits on a human clicking
    // an approval prompt) - some dApps use this as a liveness signal with their own
    // short timeout, independent of when the real account data eventually arrives, and
    // time out regardless of a correct (but slower) response if this is never sent.
    // The real extension sends this to the CONTENTSCRIPT target specifically, not INPAGE
    postToPage('GET_INPAGE_METRIMASK_ACCOUNT_VALUES', {}, CONTENTSCRIPT_TARGET);
    requestConnect().catch(() => { });
  }
});

// window.metrimask is injected as a real, page-owned object here (rather than via
// contextBridge.exposeInMainWorld) because contextBridge "copies and freezes" every
// non-function value at the moment it's exposed - window.metrimask.account would
// permanently freeze at whatever it was the instant this script first ran (always
// null), never reflecting later connect/account updates even though this preload's
// own internal state was correctly tracking them the whole time (confirmed by
// tracing: the account variable above updated correctly, but a contextBridge-exposed
// getter reading it never reflected the change on the page side). This mirrors how
// the real MetriMask extension does it too - inpage.js is injected as a plain
// <script>, not bridged, for exactly this reason.
webFrame.executeJavaScript(`
(function() {
  if (window.metrimask) return;
  var pending = {};
  var seq = 0;
  function call(method, params) {
    return new Promise(function(resolve, reject) {
      var reqId = 'm' + (++seq);
      pending[reqId] = { resolve: resolve, reject: reject };
      window.postMessage({ target: '${INTERNAL_TARGET}', kind: 'request', reqId: reqId, method: method, params: params }, '*');
    });
  }
  window.metrimask = {
    account: null,
    rpcProvider: {
      rawCall: function(method, params) { return call(method, params || []); },
      signMessage: function(params) { return call('signmessage', params || []); },
      verifyMessage: function(params) { return call('verifymessage', params || []); }
    }
  };
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    var data = event.data;
    if (!data || data.target !== '${INTERNAL_TARGET}' || data.kind !== 'response') return;
    var waiting = pending[data.reqId];
    if (!waiting) return;
    delete pending[data.reqId];
    if (data.error) waiting.reject(new Error(data.error));
    else waiting.resolve(data.result);
  });
})();
`).catch((err: any) => {
  // eslint-disable-next-line no-console
  console.error('[metrimask-preload] failed to inject page-owned provider', err);
});
