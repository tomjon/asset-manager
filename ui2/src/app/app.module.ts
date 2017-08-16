import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { FormComponent } from './form.component';
import { InputComponent } from './input.component';
import { InputValueAccessor } from './input.accessor';
import { ButtonComponent } from './button.component';

@NgModule({
  declarations: [
    AppComponent,
    FormComponent,
    InputComponent,
    InputValueAccessor,
    ButtonComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
