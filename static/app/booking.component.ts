import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { EnumPipe } from './enum.pipe';
import { LAST_OPTION } from './enum';
import { PROJECT } from './field-map';

declare var $;

@Component({
  selector: 'badass-booking',
  template: `<div>
               <table *ngIf="bookings != undefined">
                 <tr>
                   <th>User</th>
                   <th>Project</th>
                   <th>Due Out</th>
                   <th>Due In</th>
                 </tr>
                 <tr *ngIf="bookings.length == 0">
                   <td rowspan="4">No bookings</td>
                 </tr>
                 <tr *ngFor="let booking of bookings" [ngClass]="{current: current(booking)}">
                   <td>{{booking.user_label}}</td>
                   <td>{{booking.project_label}}</td>
                   <td [ngClass]="{overdue: overdueOut(booking)}">{{booking.due_out_date}}</td>
                   <td [ngClass]="{overdue: overdueIn(booking)}">{{booking.due_in_date}}</td>
                 </tr>
               </table>
             </div>
             <div id="bookingModal" class="modal fade" role="dialog">
               <form role="form" #form="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h4 class="modal-title">New Booking for <b *ngIf="asset.id_number != undefined">{{asset.id_number}}</b> <i *ngIf="asset.manufacturer != undefined">{{asset.manufacturer | enum:'manufacturer'}} </i>{{asset.model}}</h4>
                     </div>
                     <div class="modal-body">
                       <div class="form-group">
                         <label for="project">{{project.label}}</label>
                         <select *ngIf="addNew.field != project.field" class="form-control" [(ngModel)]="project.value" [name]="project.field" (ngModelChange)="onEnumChange(project)">
                           <option *ngFor="let o of options(project.field)" [value]="o.value">{{o.label}}</option>
                         </select>
                         <input #addNew type="text" *ngIf="addNew.field == project.field" class="form-control" [(ngModel)]="addNew.label" [name]="project.field" (blur)="onAddNew(project, addNew.label)" (change)="onAddNew(project, addNew.label)"/>
                       </div>
                       <div class="form-group">
                         <label for="dueOutDate">Due Out Date</label>
                         <input type="date" required class="form-control" [(ngModel)]="dueOutDate" name="dueOutDate" #f_dueOutDate="ngModel">
                         <div [hidden]="f_dueOutDate.valid" class="alert alert-danger">
                           Due out date is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="dueInDate">Due In Date</label>
                         <input type="date" required class="form-control" [(ngModel)]="dueInDate" name="dueInDate" #f_dueInDate="ngModel">
                         <div [hidden]="f_dueInDate.valid && dueInDate >= dueOutDate" class="alert alert-danger">
                           Due in date is required, and should be the same or after the due out date
                         </div>
                       </div>
                       <div *ngIf="clash" class="alert alert-danger">
                         A booking by <strong>{{clash.user_label}}</strong> already exists that clashes with your booking
                       </div>
                     </div>
                     <div class="modal-footer">
                       <button type="button" class="btn btn-default" (click)="onSubmit()" [disabled]="! form.form.valid">Submit</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Dismiss</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>`,
  styles: ['th, td { padding: 5px }',
           '.overdue { color: red }',
           '.current { background: silver }'],
  pipes: [EnumPipe]
})
export class BookingComponent {
  bookings: any[];
  clash: any;

  asset: any;
  @Input('asset') set _asset(asset: any) {
    this.asset = asset;
    this.bookings = undefined;
    this.clash = undefined;
    if (this.asset.id != undefined) {
      this.dataService.getBookings(this.asset)
                      .subscribe(bookings => this.bookings = bookings);
    }
  }

  // values from form inputs
  project: any = PROJECT;
  dueOutDate: string;
  dueInDate: string;

  addNew: any = {};
  @ViewChildren('addNew') addNewInput: QueryList<ElementRef>;

  get today(): string {
    return new Date().toISOString().substring(0, 10);
  }

  constructor(private enumService: EnumService, private dataService: DataService) {
    this.project.value = 0;
  }

  current(booking: any): boolean {
    return this.today >= booking.due_out_date && this.today <= booking.due_in_date;
  }

  overdueOut(booking: any): boolean {
    return ! booking.out_date && ! booking.in_date && this.today >= booking.due_out_date;
  }

  overdueIn(booking: any): boolean {
    return booking.out_date && ! booking.in_date && this.today >= booking.due_in_date;
  }

  onSubmit() {
    this.dataService.addBooking(this.asset, this.project.value, this.dueOutDate, this.dueInDate, {})
                    .subscribe(booking => {
                      this.clash = booking.booking_id ? booking : undefined;
                      if (! this.clash) {
                        $('#bookingModal').modal('hide');
                        this._asset = this.asset; // this to just force a reload of the table
                      }
                    });
  }

  //FIXME the following three methods are similar as those in asset.component.ts
  options(field: string) {
    return this.enumService.get(field).options().splice(1);
  }

  onEnumChange(input) {
    if (input.value == LAST_OPTION.value) {
      this.addNew.field = input.field;
      this.addNew.label = undefined;
      setTimeout(() => this.addNewInput.first.nativeElement.focus());
    }
  }

  onAddNew(input, label) {
    if (label) {
      this.enumService.addNewLabel(input.field, label)
                      .subscribe(enumValue => {
                        input.value = enumValue.value;
                        delete this.addNew.field;
                      });
    } else {
      input.value = undefined;
      delete this.addNew.field;
    }
  }
}
