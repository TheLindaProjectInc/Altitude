import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MarketPriceComponent } from './market-price.component';

describe('MarketPriceComponent', () => {
  let component: MarketPriceComponent;
  let fixture: ComponentFixture<MarketPriceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MarketPriceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MarketPriceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
