import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class TranslationService {

    constructor(
        private translateService: TranslateService,
    ) {
    }

    public async translate(key): Promise<string> {
        return new Promise<string>((resolve) => {
            this.translateService.get(key).subscribe((res: string) => {
                resolve(res)
            });
        })
    }

}