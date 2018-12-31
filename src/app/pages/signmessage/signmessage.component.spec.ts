import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SignMessageComponent } from './signmessage.component';

describe('SignMessageComponent', () => {
  let component: SignMessageComponent;
  let fixture: ComponentFixture<SignMessageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SignMessageComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SignMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
