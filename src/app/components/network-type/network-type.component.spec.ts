import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NetworkTypeComponent } from './network-type.component';

describe('NetworkTypeComponent', () => {
  let component: NetworkTypeComponent;
  let fixture: ComponentFixture<NetworkTypeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [NetworkTypeComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
