import { Component, Input, Output, EventEmitter, ViewChildren, ElementRef, QueryList } from '@angular/core';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { FieldMap } from './field-map';
import { User, ADMIN_ROLE } from './user';
import { Booking } from './booking';
import { LAST_OPTION } from './enum';
import { Results } from './results';
import { Observable } from 'rxjs/Observable';

declare var $;

@Component({
  selector: 'badass-booking',
  template: `<div id="bookingModal" class="modal fade" role="dialog">
               <form role="form" #form="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h4 class="modal-title">
                         <span *ngIf="editing">Editing Booking</span><span *ngIf="! editing">New Booking</span>
                         <span> for <i *ngIf="manufacturer != undefined">{{manufacturer | enum:'manufacturer'}} </i>{{model}} <b>{{barcode}}</b></span>
                       </h4>
                     </div>
                     <div class="modal-body">
                       <div class="form-group">
                         <label for="project">{{fieldMap.projectInput.label}}</label>
                         <select [disabled]="editing && ! booking.canEditProject(user)" class="form-control" [(ngModel)]="booking.project" [name]="fieldMap.projectInput.field">
                           <option *ngFor="let o of projectOptions" [value]="o.value">{{o.label}}</option>
                         </select>
                       </div>
                       <div class="form-group">
                         <label for="dueOutDate">Due Out Date</label>
                         <input type="date" required min="{{today}}" [disabled]="editing && ! booking.canEditDueOutDate(user)" class="form-control" [(ngModel)]="booking.due_out_date" name="dueOutDate" #f_dueOutDate="ngModel">
                         <div [hidden]="! booking.canEditDueOutDate(user) || f_dueOutDate.valid" class="alert alert-danger">
                           Due out date is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="dueInDate">Due In Date</label>
                         <input type="date" required min="{{booking.due_out_date}}" [disabled]="editing && ! booking.canEditDueInDate(user)" class="form-control" [(ngModel)]="booking.due_in_date" name="dueInDate" #f_dueInDate="ngModel">
                         <div [hidden]="! booking.canEditDueInDate(user) || (f_dueInDate.valid && booking.due_in_date >= booking.due_out_date)" class="alert alert-danger">
                           Due in date is required, and should be the same or after the due out date
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="notes">Notes</label>
                         <textarea class="form-control" [(ngModel)]="booking.notes" name="notes" rows="4"></textarea>
                       </div>
                       <div *ngIf="clash" class="alert alert-danger">
                         A booking by <strong>{{clash.user_label}}</strong> already exists that clashes with your booking
                       </div>
                     </div>
                     <div class="modal-footer">
                       <p class="info"><span class="glyphicon glyphicon-info-sign"></span> Use the <i>Today</i> button for &quot;One Day Booking&quot;</p>
                       <button type="button" class="btn btn-default" (click)="onToday()" [disabled]="! canToday">Today</button>
                       <button type="button" class="btn btn-default" (click)="onSubmit()" [disabled]="! form.form.valid">Submit</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>`
})
export class BookingComponent {
  editing: boolean = false;
  clash: any = undefined;

  @Input('user') user: User;
  @Input('asset') asset: any;
  @Input('results') results: Results;

  // collects form input values
  booking: Booking;

  @Input('booking') set _booking(booking: Booking) {
    // default some values to their previous values
    if (booking != undefined && this.booking != undefined) {
      for (let field of ['project', 'due_in_date', 'due_out_date', 'notes']) {
        if (booking[field] == undefined || booking[field] == '') {
          booking[field] = this.booking[field];
        }
      }
    }
    this.booking = booking;
    this.editing = booking.booking_id != '';
    this.clash = undefined;
  }

  @Output('event') event = new EventEmitter<any>();

  get today(): string {
    return new Date().toISOString().substring(0, 10);
  }

  get canToday(): boolean {
    let dueOutOk = this.booking.canEditDueOutDate(this.user) || this.booking.due_out_date == this.today;
    return ! this.editing || (dueOutOk && this.booking.canEditDueInDate(this.user));
  }

  onToday() {
    if (! this.canToday) return;
    this.booking.due_out_date = this.today;
    this.booking.due_in_date = this.today;
  }

  constructor(private enumService: EnumService, private dataService: DataService, private fieldMap: FieldMap) {}

  onSubmit() {
    let editFields: any = undefined;
    if (this.editing) {
      editFields = {};
      if (this.booking.canEditProject(this.user)) editFields.project = true;
      if (this.booking.canEditDueOutDate(this.user)) editFields.dueOutDate = true;
      if (this.booking.canEditDueInDate(this.user)) editFields.dueInDate = true;
    }
    this.booking.user_id = this.user.user_id;
    if (! this.editing && this.asset) {
      this.booking.asset_id = this.asset.id;
    }
    this.dataService.updateBooking(this.booking, editFields)
                    .subscribe(booking => {
                      $('#bookingModal').modal('hide');
                      this.booking.booking_id = booking.booking_id;
                      this.event.emit({addUpdateBooking: this.booking});
                      this.editing = false;
                    },
                    error => {
                      if (error.status == 409) {
                        this.clash = error.rsp.json();
                      } else {
                        Observable.throw(error);
                      }
                    });
  }

  // attempt to return the booking property, if not, return the asset property, default ''
  //FIXME this existence of this mechanism exposes the horrible design choice ;)
  defer(property: string): any {
    if (this.booking != undefined && this.booking[property] != undefined) {
      return this.booking[property];
    }
    return this.asset != undefined ? this.asset[property] : '';
  }
  get barcode(): string {
    return this.defer('barcode');
  }
  get manufacturer(): string {
    return this.defer('manufacturer');
  }
  get model(): string {
    return this.defer('model');
  }

  //FIXME the following three methods are similar as those in asset.component.ts
  options(field: string) {
    return this.enumService.get(field).options(false, this.user.role == ADMIN_ROLE);
  }

  get projectOptions(): any[] {
    return this.options(this.fieldMap.projectInput.field).filter(o => (this.results.projects[o.value] || {}).active);
  }
}
