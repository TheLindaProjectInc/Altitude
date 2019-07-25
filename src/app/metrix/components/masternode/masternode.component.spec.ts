import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MasternodeComponent } from './masternode.component';

describe('MasternodeComponent', () => {
  let component: MasternodeComponent;
  let fixture: ComponentFixture<MasternodeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MasternodeComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MasternodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
