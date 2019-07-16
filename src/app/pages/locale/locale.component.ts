import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ElectronService } from 'app/providers/electron.service';
var supportedLanguages = require('./languages');

@Component({
  selector: 'app-locale',
  templateUrl: './locale.component.html'
})
export class LocaleComponent {

  languages = [];
  search = '';

  constructor(
    private translate: TranslateService,
    private electron: ElectronService
  ) {

  }

  ngOnInit() {
    Object.keys(supportedLanguages).forEach(key => {
      this.languages.push({ local: supportedLanguages[key].local, code: supportedLanguages[key].code });
    });
  }

  filter() {
    let languages = [];
    const search = this.search.toLowerCase();
    Object.keys(supportedLanguages).forEach(key => {
      const local = supportedLanguages[key].local;
      if (!search || local.toLowerCase().indexOf(search) > -1 || key.toLowerCase().indexOf(search) > -1)
        languages.push({ local: local, code: supportedLanguages[key].code });
    });
    this.languages = languages;
  }

  get currentLanguage() {
    return this.translate.getDefaultLang();
  }

  setLangauge(language) {
    if (this.currentLanguage !== language.code) {
      this.electron.ipcRenderer.send('settings', 'SETLOCALE', language.code);
    }
  }

}
