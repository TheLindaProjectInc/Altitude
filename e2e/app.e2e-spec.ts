import { AltitudePage } from './app.po';
import { browser, element, by } from 'protractor';

describe('altitude App', () => {
  let page: AltitudePage;

  beforeEach(() => {
    page = new AltitudePage();
  });

  it('should display message saying App works !', () => {
    page.navigateTo('/');
    expect(element(by.css('app-home h1')).getText()).toMatch('App works !');
  });
});
