Altitude is offered in 103 languages that are all initially automatically translated from english using the Google Cloud Translation API.

A list of the languages offered can be found in the languages.json file. This list reflects the languages offered through Google Cloud Translation API https://cloud.google.com/translate/docs/languages.

The translation process can be run with the run.js file and setting the APIKEY to your Google Cloud Translation API key. By default the service will check the en.json (english translations) and cycle through each supported language and translate any untranslated text. Translations can also be forced to restranslate by adding their key to the `retranslate` array at the beginning of the run.js file. Translations can be removed by adding their key to the 'removeTranslation' array.

Since these translations are done using a cloud service and no context is giving as to where and how the words are used, we expect there to be translational errors such as words being in the wrong order or the text does not make sense in the context it is in. We encourage anyone who is capable to manually correct these translations errors in the appropriate translation file found in [src/assets/i18n](https://github.com/TheLindaProjectInc/Altitude/tree/master/src/assets/i18n) folder.
