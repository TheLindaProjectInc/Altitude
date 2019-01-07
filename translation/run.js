const google = require("google-translate");
const englishSource = require('../src/assets/i18n/en.json')
let languages = require('./languages.json')
const fs = require('fs');

var ggl = google(process.env.APIKEY);  // this is required to use google translate service
var retranslate = [] // add fields to here to force the translater to re-translate
var removeTranslation = [] // add fields to here to remove them from all translation files (expect en.json must be remvoed manually)

async function translateLanguageFiles() {
    console.log("Running translation service. This will take some time to complete");

    let keys = Object.keys(languages);
    for (let i = 0; i < keys.length; i++) {
        let languageName = keys[i];
        const languageData = languages[languageName];
        console.log("Translating", languageName, "...");
        let transaltionFile = `./src/assets/i18n/${languageData.code}.json`;

        let start = new Date().getTime();

        // assemble output object which will be the translations
        // of the english into the selected language
        // attempt to read exiting file so we only update
        // missing translations
        let output = {};
        if (fs.existsSync(transaltionFile)) {
            try {
                let data = fs.readFileSync(transaltionFile, 'utf8');
                output = JSON.parse(data);
            } catch (ex) {
                // failed to parse file
                // that's ok we'll just retranslate the whole file
            }
        }

        // recursively run through the objects in the english source
        // translating when we hit a string
        await walkObject(englishSource, output, languageData.code)
        // write output to langauge file
        fs.writeFileSync(transaltionFile, JSON.stringify(output, null, 4));
        console.log("Translating", languageName, "completed in", (new Date().getTime() - start) / 1000, 'seconds');
    }

    console.log("Translation finished");
}

async function walkObject(obj, output, languageCode) {
    let keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (typeof (obj[key]) === "object") {
            if (!output[key])
                output[key] = {}
            await walkObject(obj[key], output[key], languageCode);
        } else {
            if (removeTranslation.indexOf(key) > -1) {
                if (output[key]) delete output[key]
            } else if (!output[key] || retranslate.indexOf(key) > -1)
                output[key] = await translateString(obj[key], 'en', languageCode)
        }
    }
}

function translateString(text, sourceLanguage, destLanguage) {
    return new Promise((resolve, reject) => {
        ggl.translate(text, sourceLanguage, destLanguage, (err, translation) => {
            if (err) {
                reject(err)
            } else {
                resolve(translation.translatedText.replace(" ...", "..."))
            }
        });
    })
}

async function translateLanguagesFile() {
    console.log("Running translation service. This will take some time to complete");

    let keys = Object.keys(languages);
    for (let i = 0; i < keys.length; i++) {
        let languageName = keys[i];
        console.log("Translating", languageName, 'en ->', languages[languageName].code);
        languages[languageName].local = await translateString(languageName, 'en', languages[languageName].code);
    }

    fs.writeFile(`./src/assets/i18n/languages.json`, JSON.stringify(languages, null, 4), function (err) {
        if (err) throw err;
    });

    console.log("Translation finished");
}

// run this to translate the list of languages to their local translation
// translateLanguagesFile();

// run this to translate english source into all supported languages
// warning this can incur costs with google translate and will take
// take some time
translateLanguageFiles();
