import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MainChainCheckComponent } from './main-chain-check.component';

describe('MainChainCheckComponent', () => {
  let component: MainChainCheckComponent;
  let fixture: ComponentFixture<MainChainCheckComponent>;

  beforeEach(waitForAsync(() => {
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
