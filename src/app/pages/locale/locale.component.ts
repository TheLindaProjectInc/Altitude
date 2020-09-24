import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ElectronService } from 'app/providers/electron.service';
import Languages from 'app/languages';
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
    Languages.supported.forEach(language => {
      this.languages.push(Languages.getLanguage(language));
    });
  }

  filter() {
    let languages = [];
    const search = this.search.toLowerCase();
    Languages.supported.forEach(language => {
      const local = Languages.getLocal(language);
      if (!search || local.toLowerCase().indexOf(search) > -1 || language.toLowerCase().indexOf(search) > -1)
        languages.push(Languages.getLanguage(language));
    });
    this.languages = languages;
  }

  get currentLanguage() {
    return this.translate.getDefaultLang();
  }

  setLanguage(language) {
    if (this.currentLanguage !== language.code) {
      this.electron.ipcRenderer.send('settings', 'SETLOCALE', language.code);
    }
  }

}
