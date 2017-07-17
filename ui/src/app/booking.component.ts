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
                       <h4 *ngIf="group == undefined" class="modal-title">
                         <span *ngIf="editing">Editing Booking</span><span *ngIf="! editing">New Booking</span>
                         <span> for <i *ngIf="manufacturer != undefined">{{manufacturer | enum:'manufacturer'}} </i>{{model}} <b>{{barcode}}</b></span>
                       </h4>
                       <h4 *ngIf="group != undefined" class="modal-title">
                         <span>Editing {{group.length}} Bookings</span>
                       </h4>
                     </div>
                     <div class="modal-body">
                       <div class="form-group">
                         <label for="project">{{fieldMap.projectInput.label}} <input *ngIf="group != undefined" title="Check to set project for all assets in group" name="editProject" type="checkbox" [disabled]="! canEditProject" [(ngModel)]="editFields.project"/></label>
                         <select [disabled]="! canEditProject" class="form-control" [(ngModel)]="booking.project" [name]="fieldMap.projectInput.field">
                           <option *ngFor="let o of projectOptions" [value]="o.value" [disabled]="o.disabled">{{o.label}}</option>
                         </select>
                       </div>
                       <div class="form-group">
                         <label for="dueOutDate">Due Out Date <input *ngIf="group != undefined" title="Check to set due out date for all assets in group" name="editDueOutDate" type="checkbox" [disabled]="! canEditDueOutDate" [(ngModel)]="editFields.dueOutDate"/></label>
                         <input type="date" required [attr.min]="canEditDueOutDate ? today : null" [disabled]="! canEditDueOutDate" class="form-control" [(ngModel)]="booking.due_out_date" name="dueOutDate" #f_dueOutDate="ngModel">
                         <div [hidden]="! canEditDueOutDate || f_dueOutDate.valid" class="alert alert-danger">
                           Due out date is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="dueInDate">Due In Date <input *ngIf="group != undefined" title="Check to set due in date for all assets in group" name="editDueInDate" type="checkbox" [disabled]="! canEditDueInDate" [(ngModel)]="editFields.dueInDate"/></label>
                         <input type="date" required min="{{booking.due_out_date}}" [disabled]="! canEditDueInDate" class="form-control" [(ngModel)]="booking.due_in_date" name="dueInDate" #f_dueInDate="ngModel">
                         <div [hidden]="! canEditDueInDate || (f_dueInDate.valid && booking.due_in_date >= booking.due_out_date)" class="alert alert-danger">
                           Due in date is required, and should be the same or after the due out date
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="notes">Notes <input *ngIf="group != undefined" title="Check to set notes for all assets in group" name="editNotes" type="checkbox" [(ngModel)]="editFields.notes"/></label>
                         <p *ngIf="group != undefined && editFields.notes" class="warn">Text entered here will overwrite existing notes on all {{group.length}} assets</p>
                         <textarea class="form-control" [(ngModel)]="booking.notes" name="notes" rows="4"></textarea>
                       </div>
                       <div *ngIf="clash" class="alert alert-danger">
                         A booking by <strong>{{clash.user_label}}</strong> already exists that clashes with your booking
                       </div>
                     </div>
                     <div class="modal-footer">
                       <p class="info"><span class="glyphicon glyphicon-info-sign"></span> Use the <i>Today</i> button for &quot;One Day Booking&quot;</p>
                       <button type="button" class="btn btn-default" title="Set due out and due in dates to today, where possible" (click)="onToday()" [disabled]="! canToday">Today</button>
                       <button type="button" class="btn btn-default" (click)="onSubmit()" [disabled]="! form.form.valid">Submit</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>`,
  styles: ['.warn { font-style: italic }']
})
export class BookingComponent {
  editing: boolean = false;
  clash: any = undefined;

  @Input('user') user: User;
  @Input('asset') asset: any;
  @Input('results') results: Results;

  // collects form input values
  booking: Booking;
  group: Booking[];
  editFields: any = {};

  @Input('booking') set _booking(booking: Booking) {
    // default some values to their previous values
    if (booking != undefined && this.booking != undefined) {
      for (let field of ['project', 'due_in_date', 'due_out_date', 'notes']) {
        if (booking[field] === undefined || booking[field] === '') {
          booking[field] = this.booking[field];
        }
      }
    }
    this.booking = booking;
    this.editing = booking == undefined || booking.booking_id != '';
    this.clash = undefined;
  }

  @Input('group') set _group(group: Booking[]) {
    this.group = group;
    if (group != undefined) {
      this.booking = new Booking();
      for (let booking of group) {
        for (let field of ['project', 'due_in_date', 'due_out_date', 'notes']) {
          if (this.booking[field] == undefined) {
            this.booking[field] = booking[field];
          } else if (this.booking[field] != booking[field]) {
            if (field == 'project') {
              this.booking[field] = '';
            } else if (booking[field] > this.booking[field]){
              this.booking[field] = booking[field];
            }
          }
        }
      }
      this.editFields.project = this.canEditProject;
      this.editFields.dueOutDate = this.canEditDueOutDate;
      this.editFields.dueInDate = this.canEditDueInDate;
      this.editFields.notes = true;
    }
  }

  @Output('event') event = new EventEmitter<any>();

  get today(): string {
    return new Date().toISOString().substring(0, 10);
  }

  get canToday(): boolean {
    if (this.booking.due_out_date == this.today && this.booking.due_in_date == this.today) return false;
    let dueOutOk = this.booking.canEditDueOutDate(this.user) || this.booking.due_out_date == this.today;
    return ! this.editing || (dueOutOk && this.booking.canEditDueInDate(this.user));
  }

  onToday() {
    if (! this.canToday) return;
    if (this.canEditDueOutDate) {
      this.booking.due_out_date = this.today;
    }
    if (this.canEditDueInDate) {
      this.booking.due_in_date = this.today;
    }
  }

  constructor(private enumService: EnumService, private dataService: DataService, private fieldMap: FieldMap) {}

  onSubmit() {
    this.group != undefined ? this.submitGroup(): this.submit();
  }

  submit() {
    let editFields: any = undefined;
    if (this.editing) {
      editFields = {};
      if (this.canEditProject) editFields.project = true;
      if (this.canEditDueOutDate) editFields.dueOutDate = true;
      if (this.canEditDueInDate) editFields.dueInDate = true;
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

  submitGroup() {
    let obs = [];
    for (let booking of this.group) {
      // update booking values from modal form fields
      booking.project = this.booking.project;
      booking.due_out_date = this.booking.due_out_date;
      booking.due_in_date = this.booking.due_in_date;
      booking.notes = this.editFields.notes ? this.booking.notes : undefined;
      obs.push(this.dataService.updateBooking(booking, this.editFields));
    }
    Observable.forkJoin(obs).subscribe(() => {
        $('#bookingModal').modal('hide');
        this.event.emit({addUpdateBooking: true});
      }, error => {
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
    return this.options(this.fieldMap.projectInput.field)
               .map(o => {
                 o.disabled = !(this.results.projects[o.value] || {}).active;
                 return o;
               });
  }

  // group bookings

  canGroup(property: string): boolean {
    if (this.group == undefined) {
      return ! this.editing || this.booking[property](this.user);
    } else {
      for (let booking of this.group) {
        if (! booking[property](this.user)) return false;
      }
      return true;
    }
  }

  get canEditProject(): boolean {
    return this.canGroup('canEditProject');
  }

  get canEditDueOutDate(): boolean {
    return this.canGroup('canEditDueOutDate');
  }

  get canEditDueInDate(): boolean {
    return this.canGroup('canEditDueInDate');
  }
}
