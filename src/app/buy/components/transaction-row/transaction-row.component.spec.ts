import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoryTransactionRowComponent } from './transaction-row.component';

describe('TransactionRowComponent', () => {
  let component: HistoryTransactionRowComponent;
  let fixture: ComponentFixture<HistoryTransactionRowComponent>;

  beforeEach(async(() => {
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
