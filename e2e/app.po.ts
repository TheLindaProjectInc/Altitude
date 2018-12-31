import { browser, element, by } from 'protractor';

/* tslint:disable */
export class AltitudePage {
  navigateTo(route: string) {
    return browser.get(route);
  }
}
