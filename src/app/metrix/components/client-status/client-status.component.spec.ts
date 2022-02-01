import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ClientStatusComponent } from './client-status.component';

describe('ClientStatusComponent', () => {
  let component: ClientStatusComponent;
  let fixture: ComponentFixture<ClientStatusComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ClientStatusComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ClientStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
