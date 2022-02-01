import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { HistoryTransactionRowComponent } from './transaction-row.component';

describe('TransactionRowComponent', () => {
  let component: HistoryTransactionRowComponent;
  let fixture: ComponentFixture<HistoryTransactionRowComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [HistoryTransactionRowComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoryTransactionRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
