import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { LoginComponent } from './login.component';
import { AssetComponent } from './asset.component';
import { TableComponent } from './table.component';
import { BookingComponent} from './booking.component';
import { AttachmentComponent } from './attachment.component';
import { EnumPipe } from './enum.pipe';
import { FieldMap } from './field-map';
import { DataService } from './data.service';
import { EnumService } from './enum.service';

// Add the RxJS Observable operators we need in this module
import './rxjs-operators';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    AssetComponent,
    TableComponent,
    BookingComponent,
    AttachmentComponent,
    EnumPipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule
  ],
  providers: [
    DataService,
    EnumService,
    FieldMap],
  bootstrap: [AppComponent]
})
export class AppModule { }
