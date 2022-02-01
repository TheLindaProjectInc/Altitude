import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BudgetCardComponent } from './budget-card.component';

describe('BudgetCardComponent', () => {
  let component: BudgetCardComponent;
  let fixture: ComponentFixture<BudgetCardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BudgetCardComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BudgetCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
