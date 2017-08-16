import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { InputComponent } from './input.component';
import { InputValueAccessor } from './input.accessor';
import { ButtonComponent } from './button.component';
import { FormComponent } from './form.component';

import { FormsModule } from '@angular/forms';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AppComponent, InputComponent, ButtonComponent, FormComponent, InputValueAccessor ],
      imports: [ FormsModule ] //FIXME why is this necessary to avoid 'unknown element' errors? seems to be because of InputComponent which has <input>
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
