Altitude is offered in 103 languages that are all initially automatically translated from English using the Google Cloud Translation API.

A list of the languages offered can be found in [languages.json](languages.json). This list reflects the languages offered through the [Google Cloud Translation API](https://cloud.google.com/translate/docs/languages).

Since these translations are done using a cloud service and no context is given as to where and how the words are used, we expect there to be translation errors such as words being in the wrong order or text that doesn't make sense in the context it's used. We encourage anyone who is capable to manually correct these errors in the appropriate translation file found in [src/assets/i18n](https://github.com/TheLindaProjectInc/Altitude/tree/master/src/assets/i18n).

## Running it

This is a manual, on-demand tool - it is **not** run as part of `npm install` or any build step, specifically so it only runs (and only costs money) when someone deliberately runs it.

```
APIKEY=your-google-cloud-translation-api-key npm run translate
```

(PowerShell: `$env:APIKEY = "your-key"; npm run translate`)

Alternatively, put `APIKEY=your-key` in a `translation/.env` file (gitignored) and just run `npm run translate` - the key set directly in the shell always takes priority.

### Always check the cost first

```
npm run translate -- --dry-run
```

This prints exactly how many new/changed strings it found, an estimated character count, and an estimated cost, **without calling the API, writing any files, or needing `APIKEY` set at all**. Do this before every real run, especially after a large batch of new English strings has been added.

When you do run for real (without `--dry-run`), it prints the same estimate and asks for confirmation before spending anything - pass `--yes`/`-y` to skip that prompt if you've already reviewed a `--dry-run` and are scripting the run.

### Other options

```
npm run translate -- --languages=fr,de,es   # only these language codes, instead of all 103
npm run translate -- --language-names       # also (re)translate each language's own display name
npm run translate -- --help
```

## How it decides what needs translating (and what doesn't)

Every leaf string in `src/assets/i18n/en.json` is tracked in `translation/state.json`, which records exactly what English text produced each existing translation, per key, per language. On each run:

- If a key's English text is unchanged since it was last translated (per `state.json`), the existing translation is reused - **no API call, no cost**.
- If the exact same English text appears at a *different* key (e.g. "Cancel" reused across many sections) and already has a valid translation somewhere, that's reused too - this is the main thing that keeps cost down, since a lot of short UI strings repeat.
- Only text that's genuinely new, or has actually changed since it was last translated, gets sent to the API - and even then, each unique string is only translated **once** per language, no matter how many keys share it.

This replaces the previous approach of only checking "does this key already have *some* value" - which meant an edited English string silently never got re-translated unless someone remembered to add it to a `retranslate` list.

`state.json` is checked in to the repo. Losing it isn't harmful (the tool falls back to trusting whatever's already in each translated file), but keeping it means everyone gets accurate change-detection instead of re-adopting the same baseline from scratch.

You can still force things manually at the top of `run.js`:
- Add a leaf key name to `retranslate` to force it to be re-translated even though its English text hasn't changed (e.g. a machine translation came out wrong).
- Add a leaf key name (or `parentKey.leafKey`) to `removeTranslation` to remove it from every translated file - `en.json` itself must still be edited by hand.

## Package / API notes

Translation is done via the official [`@google-cloud/translate`](https://www.npmjs.com/package/@google-cloud/translate) package (`v2` Translate client), using a plain API key - no GCP project or service account setup is required. This replaced the earlier `google-translate` npm package, which its own maintainers deprecated in favor of this official package.

Strings are sent to the API in batches (up to 128 per request, the API's own limit) rather than one request per string, which is mainly what made a full run previously take about an hour - the character-based billing is unaffected by batching, but round-trip latency dominated the old one-request-per-string approach.
