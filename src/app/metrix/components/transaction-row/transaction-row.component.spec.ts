import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionRowComponent } from './transaction-row.component';

describe('TransactionRowComponent', () => {
  let component: TransactionRowComponent;
  let fixture: ComponentFixture<TransactionRowComponent>;

  beforeEach(async(() => {
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
