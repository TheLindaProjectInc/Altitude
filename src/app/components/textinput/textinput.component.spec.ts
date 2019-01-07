import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TextinputComponent } from './textinput.component';

describe('TextinputComponent', () => {
  let component: TextinputComponent;
  let fixture: ComponentFixture<TextinputComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TextinputComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TextinputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
