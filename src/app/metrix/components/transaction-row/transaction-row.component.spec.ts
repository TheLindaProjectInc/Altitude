import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TransactionRowComponent } from './transaction-row.component';

describe('TransactionRowComponent', () => {
  let component: TransactionRowComponent;
  let fixture: ComponentFixture<TransactionRowComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [TransactionRowComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TransactionRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
