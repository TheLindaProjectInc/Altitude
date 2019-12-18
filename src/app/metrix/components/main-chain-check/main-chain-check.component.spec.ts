import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MainChainCheckComponent } from './main-chain-check.component';

describe('MainChainCheckComponent', () => {
  let component: MainChainCheckComponent;
  let fixture: ComponentFixture<MainChainCheckComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MainChainCheckComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MainChainCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
