#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// tiny built-in .env loader (avoids adding a dotenv dependency for one optional
// variable) - translation/.env is gitignored; APIKEY set directly in the shell 
// takes precedence
function loadDotEnv(file) {
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!(key in process.env)) process.env[key] = value;
    }
}
loadDotEnv(path.join(__dirname, '.env'));

const englishSource = require('../src/assets/i18n/en.json');
const languages = require('./languages.json');

const I18N_DIR = path.join(__dirname, '../src/assets/i18n');
const STATE_FILE = path.join(__dirname, 'state.json');

// add leaf key names here to force them to be re-translated even though their English
// source text hasn't changed (e.g. a previous machine translation came out wrong)
const retranslate = [];
// add leaf key names (or "parentKey.leafKey") here to remove them from every
// translated file - en.json itself must still be edited manually
const removeTranslation = [];

// Google Cloud Translation Basic (v2) pricing is per character, independent of how
// many strings are batched into a request - approximate, verify current pricing at
// https://cloud.google.com/translate/pricing before relying on this for budgeting
const PRICE_PER_MILLION_CHARS = 20;
// the v2 API accepts at most 128 "q" segments per request
const MAX_BATCH_SIZE = 128;
// how many languages to translate concurrently
const LANGUAGE_CONCURRENCY = 5;

function parseArgs(argv) {
    const args = { dryRun: false, yes: false, languages: null, languageNames: false };
    for (const arg of argv) {
        if (arg === '--dry-run') args.dryRun = true;
        else if (arg === '--yes' || arg === '-y') args.yes = true;
        else if (arg === '--language-names') args.languageNames = true;
        else if (arg.startsWith('--languages=')) {
            args.languages = arg.slice('--languages='.length).split(',').map(s => s.trim()).filter(Boolean);
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
    }
    return args;
}

function printHelp() {
    console.log(`
Usage: node translation/run.js [options]
       npm run translate -- [options]

Translates src/assets/i18n/en.json into every language listed in
translation/languages.json using the Google Cloud Translation API.
Only new or changed English strings are ever sent to the API - see
translation/README.md for how that's tracked.

Options:
  --dry-run              Show what would be translated and its estimated cost,
                          without calling the API, writing any files, or
                          needing APIKEY set at all.
  --yes, -y               Skip the confirmation prompt and translate immediately.
  --languages=fr,de,es    Only process these language codes (comma separated),
                          instead of every language in languages.json.
  --language-names        Also (re)translate each language's own display name
                          (e.g. "German" -> "Deutsch") into src/assets/i18n/languages.json.
  --help, -h              Show this help.
`);
}

function loadState() {
    if (!fs.existsSync(STATE_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (ex) {
        console.warn('translation/state.json failed to parse - starting fresh tracking state.');
        console.warn('Existing translated files are untouched; only cost-tracking metadata is affected.');
        return {};
    }
}

function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// flattens the nested en.json into a flat list of {keyPath, key, parentKey, text}.
// parentKey mirrors the original walkObject()'s semantics: the immediate containing
// object's own key (a single segment), not the full dotted path - this is what
// removeTranslation/retranslate have always matched against
function flatten(obj, keyPathPrefix, parentKey) {
    const out = [];
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        const keyPath = keyPathPrefix ? `${keyPathPrefix}.${key}` : key;
        if (value && typeof value === 'object') {
            out.push(...flatten(value, keyPath, key));
        } else {
            out.push({ keyPath, key, parentKey: parentKey || '', text: value });
        }
    }
    return out;
}

function getNested(obj, keyPath) {
    return keyPath.split('.').reduce((o, k) => (o && typeof o === 'object') ? o[k] : undefined, obj);
}

function setNested(obj, keyPath, value) {
    const parts = keyPath.split('.');
    let node = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (typeof node[parts[i]] !== 'object' || node[parts[i]] === null) node[parts[i]] = {};
        node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = value;
}

function isRemoved(entry) {
    return removeTranslation.indexOf(entry.key) > -1 || removeTranslation.indexOf(entry.parentKey + '.' + entry.key) > -1;
}

// A key's existing translation is reusable without any API call when either:
//  (a) we've previously confirmed that exact English text produced it (tracked in
//      state.json, keyed by keyPath - not just "does the key exist in the output
//      file", which is what silently let changed English text go untranslated
//      forever before), or
//  (b) we've never tracked this key's source text before at all (state.json didn't
//      exist yet, or predates this key) but a translation is already sitting on disk.
//      Adopting it here, once, is what avoids re-translating - and re-paying for -
//      every already-translated string the very first time this tracking exists.
//      Any *actual* future change to the English text will already have a tracked
//      source to compare against on every run after this one.
function isReusable(entry, existingOutput, languageState) {
    if (isRemoved(entry)) return false;
    if (retranslate.indexOf(entry.key) > -1) return false;
    const existingValue = getNested(existingOutput, entry.keyPath);
    if (existingValue === undefined) return false;
    const knownSource = languageState[entry.keyPath];
    return knownSource === entry.text || knownSource === undefined;
}

// Determines, for one target language, which (keyPath, text) pairs already have a
// valid translation and which genuinely need an API call. Beyond direct reuse, any
// English text that repeats across different keys (e.g. "Cancel" reused in many
// sections) resolves for free from whatever already-valid translation exists for that
// exact text, even under a different key - this is the main lever for cutting cost.
function planLanguage(sourceEntries, existingOutput, languageState) {
    const validTranslationByText = new Map(); // sourceText -> translatedText
    for (const entry of sourceEntries) {
        if (isReusable(entry, existingOutput, languageState)) {
            validTranslationByText.set(entry.text, getNested(existingOutput, entry.keyPath));
        }
    }

    const reused = [];
    const needsTranslation = [];
    for (const entry of sourceEntries) {
        if (isRemoved(entry)) continue;
        if (isReusable(entry, existingOutput, languageState)) {
            reused.push({ keyPath: entry.keyPath, text: entry.text, value: getNested(existingOutput, entry.keyPath) });
        } else if (validTranslationByText.has(entry.text)) {
            reused.push({ keyPath: entry.keyPath, text: entry.text, value: validTranslationByText.get(entry.text) });
        } else {
            needsTranslation.push({ keyPath: entry.keyPath, text: entry.text });
        }
    }
    return { reused, needsTranslation };
}

async function runWithConcurrency(items, limit, worker) {
    let index = 0;
    async function next() {
        while (index < items.length) {
            const i = index++;
            await worker(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
}

// rebuilds one language's output file from its plan (reused entries + any freshly
// translated ones), updates state.json's tracking for every key it writes, and saves
// the file. Never makes a network call itself - freshTranslations is whatever the
// caller already fetched (or an empty Map, for a run with nothing new to fetch)
function applyPlan(plan, sourceEntries, state, freshTranslations) {
    const output = {};
    const reusedByKeyPath = new Map(plan.reused.map(r => [r.keyPath, r.value]));
    for (const entry of sourceEntries) {
        if (isRemoved(entry)) {
            delete state[plan.code][entry.keyPath];
            continue;
        }
        if (reusedByKeyPath.has(entry.keyPath)) {
            setNested(output, entry.keyPath, reusedByKeyPath.get(entry.keyPath));
            state[plan.code][entry.keyPath] = entry.text;
        } else if (freshTranslations.has(entry.text)) {
            setNested(output, entry.keyPath, freshTranslations.get(entry.text));
            state[plan.code][entry.keyPath] = entry.text;
        } else {
            // shouldn't happen, but never drop a key we can't confidently resolve -
            // fall back to whatever was already on disk
            const fallback = getNested(plan.existingOutput, entry.keyPath);
            if (fallback !== undefined) setNested(output, entry.keyPath, fallback);
        }
    }
    fs.writeFileSync(plan.outputFile, JSON.stringify(output, null, 4));
}

function applyPlansLocally(plans, sourceEntries, state) {
    const empty = new Map();
    for (const plan of plans) applyPlan(plan, sourceEntries, state, empty);
}

async function translateUniqueTexts(translateClient, texts, targetLanguage) {
    const results = new Map();
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
        const batch = texts.slice(i, i + MAX_BATCH_SIZE);
        const [translations] = await translateClient.translate(batch, { from: 'en', to: targetLanguage });
        const translatedArray = Array.isArray(translations) ? translations : [translations];
        batch.forEach((text, idx) => results.set(text, translatedArray[idx].replace(' ...', '...')));
    }
    return results;
}

function confirm(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(/^y(es)?$/i.test(answer.trim()));
        });
    });
}

async function translateLanguageNames(translateClient) {
    console.log('Translating language display names into their own language...');
    const start = Date.now();
    const output = JSON.parse(JSON.stringify(languages)); // don't mutate translation/languages.json itself
    await runWithConcurrency(Object.keys(output), 10, async (languageName) => {
        const data = output[languageName];
        const [translated] = await translateClient.translate(languageName, { from: 'en', to: data.code });
        data.local = translated;
    });
    const outFile = path.join(I18N_DIR, 'languages.json');
    fs.writeFileSync(outFile, JSON.stringify(output, null, 4));
    console.log(`Language names translated in ${((Date.now() - start) / 1000).toFixed(1)}s -> ${outFile}`);
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const sourceEntries = flatten(englishSource, '', '');
    const state = loadState();

    let languageEntries = Object.entries(languages);
    if (args.languages) {
        languageEntries = languageEntries.filter(([, data]) => args.languages.includes(data.code));
        if (!languageEntries.length) {
            console.error('No languages matched --languages filter:', args.languages.join(','));
            process.exit(1);
        }
    }

    // ---- planning phase: pure local computation, no network calls, no API key needed ----
    const plans = [];
    for (const [languageName, languageData] of languageEntries) {
        const code = languageData.code;
        const outputFile = path.join(I18N_DIR, `${code}.json`);
        let existingOutput = {};
        if (fs.existsSync(outputFile)) {
            try {
                existingOutput = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
            } catch (ex) {
                console.warn(`Warning: ${code}.json failed to parse - it will be rewritten from scratch for this run.`);
            }
        }
        if (!state[code]) state[code] = {};
        const plan = planLanguage(sourceEntries, existingOutput, state[code]);
        plans.push({ languageName, code, outputFile, existingOutput, ...plan });
    }

    let totalNewChars = 0;
    let totalNewSegments = 0;
    for (const plan of plans) {
        const uniqueTexts = new Set(plan.needsTranslation.map(e => e.text));
        totalNewSegments += uniqueTexts.size;
        for (const text of uniqueTexts) totalNewChars += text.length;
    }
    const estimatedCost = (totalNewChars / 1000000) * PRICE_PER_MILLION_CHARS;

    console.log(`Languages: ${plans.length}`);
    console.log(`New/changed strings to translate: ${totalNewSegments} (deduplicated per language), ~${totalNewChars.toLocaleString()} characters`);
    console.log(`Estimated cost: ~$${estimatedCost.toFixed(2)} (Google Cloud Translation Basic, $${PRICE_PER_MILLION_CHARS}/1M chars - verify current pricing at https://cloud.google.com/translate/pricing)`);

    if (args.dryRun) {
        console.log('\n--dry-run: no API calls made, no files written.');
        return;
    }

    if (totalNewSegments === 0 && !args.languageNames) {
        console.log('Nothing to translate - every string is already up to date.');
        // still write out state.json even though there was nothing new: this locks in
        // the currently-adopted baseline (see isReusable()'s comment) so that a future
        // change to an English string that was never itself re-translated is reliably
        // detected next time, instead of silently reusing a now-stale translation
        // forever just because it was never individually confirmed via an API call
        applyPlansLocally(plans, sourceEntries, state);
        saveState(state);
        return;
    }

    if (totalNewSegments > 0 && !args.yes) {
        const proceed = await confirm('\nProceed with translation? [y/N] ');
        if (!proceed) {
            console.log('Aborted - nothing was translated or written.');
            return;
        }
    }

    if (!process.env.APIKEY) {
        console.error('APIKEY environment variable is not set.');
        console.error('Set it to your Google Cloud Translation API key, e.g. APIKEY=... npm run translate');
        console.error('or put APIKEY=... in a translation/.env file.');
        process.exit(1);
    }

    const { Translate } = require('@google-cloud/translate').v2;
    const translateClient = new Translate({ key: process.env.APIKEY });

    let succeeded = 0;
    let failed = 0;
    await runWithConcurrency(plans, LANGUAGE_CONCURRENCY, async (plan) => {
        const start = Date.now();
        try {
            const uniqueTexts = Array.from(new Set(plan.needsTranslation.map(e => e.text)));
            let freshTranslations = new Map();
            if (uniqueTexts.length) {
                console.log(`[${plan.code}] translating ${uniqueTexts.length} new/changed string(s)...`);
                freshTranslations = await translateUniqueTexts(translateClient, uniqueTexts, plan.code);
            }
            applyPlan(plan, sourceEntries, state, freshTranslations);
            succeeded++;
            console.log(`[${plan.code}] done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
        } catch (ex) {
            failed++;
            console.error(`[${plan.code}] failed:`, ex && ex.message ? ex.message : ex);
            console.error(`[${plan.code}] left untouched on disk - re-run to retry just this language with --languages=${plan.code}`);
        }
    });

    saveState(state);
    console.log(`\nTranslation finished: ${succeeded} language(s) updated, ${failed} failed.`);

    if (args.languageNames) {
        await translateLanguageNames(translateClient);
    }
}

main().catch((ex) => {
    console.error(ex);
    process.exit(1);
});
