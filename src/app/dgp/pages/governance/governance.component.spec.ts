import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GovernanceComponent } from './governance.component';

describe('GovernanceComponent', () => {
  let component: GovernanceComponent;
  let fixture: ComponentFixture<GovernanceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [GovernanceComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GovernanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
