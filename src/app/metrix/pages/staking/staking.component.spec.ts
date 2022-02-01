import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { StakingComponent } from './staking.component';

describe('StakingComponent', () => {
  let component: StakingComponent;
  let fixture: ComponentFixture<StakingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ StakingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StakingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
