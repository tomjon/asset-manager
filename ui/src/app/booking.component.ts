import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { EnumPipe } from './enum.pipe';
import { User, ADMIN_ROLE } from './user';
import { Booking } from './booking';
import { LAST_OPTION } from './enum';
import { BOOKING_PROJECT } from './field-map';

declare var $;

@Component({
  selector: 'badass-booking',
  template: `<div>
               <table *ngIf="bookings != undefined">
                 <thead>
                   <tr>
                     <th>User</th>
                     <th>Project</th>
                     <th>Due Out</th>
                     <th>Due In</th>
                     <th></th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr *ngIf="bookings.length == 0">
                     <td rowspan="5">No future bookings</td>
                   </tr>
                   <tr *ngFor="let booking of bookings" [ngClass]="{current: current(booking)}">
                     <td class="row">{{booking.user_label}}</td>
                     <td class="row">{{booking.project_label}}</td>
                     <td class="row" [ngClass]="{good: isOut(booking) || backIn(booking), overdue: overdueOut(booking)}">{{booking.due_out_date}}</td>
                     <td class="row" [ngClass]="{good: backIn(booking), overdue: overdueIn(booking)}">{{booking.due_in_date}}</td>
                     <td>
                       <span *ngIf="canEdit(booking)" class="glyphicon glyphicon-pencil" (click)="onEdit(booking)" data-toggle="modal" data-target="#bookingModal"></span>
                       <span *ngIf="canDelete(booking)" class="glyphicon glyphicon-trash" (click)="onDelete(booking)"></span>
                     </td>
                   </tr>
                 </tbody>
               </table>
             </div>
             <div id="bookingModal" class="modal fade" role="dialog">
               <form role="form" #form="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal" (click)="editing = false">&times;</button>
                       <h4 class="modal-title"><span *ngIf="editing">Editing Booking</span><span *ngIf="! editing">New Booking</span> for <b *ngIf="asset.id_number != undefined">{{asset.id_number}}</b> <i *ngIf="asset.manufacturer != undefined">{{asset.manufacturer | enum:'manufacturer'}} </i>{{asset.model}}</h4>
                     </div>
                     <div class="modal-body">
                       <div class="form-group">
                         <label for="project">{{projectInput.label}}</label>
                         <select *ngIf="addNew.field != projectInput.field" [disabled]="! canEditProject(booking)" class="form-control" [(ngModel)]="booking.project" [name]="projectInput.field" (ngModelChange)="onEnumChange(projectInput)">
                           <option *ngFor="let o of options(projectInput.field)" [value]="o.value">{{o.label}}</option>
                         </select>
                         <input #addNew type="text" *ngIf="addNew.field == projectInput.field" class="form-control" [(ngModel)]="addNew.label" [name]="projectInput.field" (blur)="onAddNew(projectInput, addNew.label)" (change)="onAddNew(projectInput, addNew.label)"/>
                       </div>
                       <div class="form-group">
                         <label for="dueOutDate">Due Out Date</label>
                         <input type="date" required min="{{today}}" [disabled]="! canEditDueOutDate(booking)" class="form-control" [(ngModel)]="booking.due_out_date" name="dueOutDate" #f_dueOutDate="ngModel">
                         <div [hidden]="! canEditDueOutDate(booking) || f_dueOutDate.valid" class="alert alert-danger">
                           Due out date is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="dueInDate">Due In Date</label>
                         <input type="date" required min="{{booking.due_out_date}}" [disabled]="! canEditDueInDate(booking)" class="form-control" [(ngModel)]="booking.due_in_date" name="dueInDate" #f_dueInDate="ngModel">
                         <div [hidden]="! canEditDueInDate(booking) || (f_dueInDate.valid && booking.due_in_date >= booking.due_out_date)" class="alert alert-danger">
                           Due in date is required, and should be the same or after the due out date
                         </div>
                       </div>
                       <div *ngIf="clash" class="alert alert-danger">
                         A booking by <strong>{{clash.user_label}}</strong> already exists that clashes with your booking
                       </div>
                     </div>
                     <div class="modal-footer">
                       <button type="button" class="btn btn-default" (click)="onSubmit()" [disabled]="! form.form.valid">Submit</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal" (click)="editing = false">Close</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>`,
  styles: ['th, td { padding: 5px }',
           '.good { color: green }',
           '.overdue { color: red }',
           '.current .row { background: lightgrey }',
           '.glyphicon { cursor: pointer }']
})
export class BookingComponent {
  bookings: any[];
  clash: any;

  asset: any;
  @Input('asset') set _asset(asset: any) {
    if (asset == undefined || this.asset == undefined || this.asset.id != asset.id) {
      this.bookings = undefined;
    }
    this.asset = asset;
    this.clash = undefined;
    if (this.asset.id != undefined) {
      this.getBookings();
    }
  }
  @Input('user') user: User;

  @Output('status') status = new EventEmitter<any>();

  book(out: boolean) {
    if (out != undefined) {
      this.dataService.book(this.asset, out)
                      .subscribe(() => this.getBookings());
    }
  }

  projectInput: any = BOOKING_PROJECT;

  // collects form input values
  booking: Booking = new Booking();
  editing: boolean = false;

  addNew: any = {};
  @ViewChildren('addNew') addNewInput: QueryList<ElementRef>;

  get today(): string {
    return new Date().toISOString().substring(0, 10);
  }

  constructor(private enumService: EnumService, private dataService: DataService) {}

  getBookings() {
    this.dataService.getBookings(this.asset)
                    .subscribe(bookings => {
                      this.bookings = bookings;
                      this.status.emit(this.getStatus(bookings));
                    });
  }

  current(booking: any): boolean {
    return this.today >= booking.due_out_date && this.today <= booking.due_in_date;
  }

  // asset is 'out' if it has been taken out but not returned in
  isOut(booking: any): boolean {
    return booking.out_date && ! booking.in_date;
  }

  // asset is 'back in' if it has been returned before the due in date
  backIn(booking: any): boolean {
    return booking.in_date && booking.in_date <= booking.due_in_date;
  }

  // asset is 'overdue out' if it has not been taken out, and today is after the due out date;
  // but today is also before the due in date, in case this is a lapsed booking
  overdueOut(booking: any): boolean {
    return ! booking.out_date && this.today >= booking.due_out_date && this.today <= booking.due_in_date;
  }

  // asset is 'overdue in' if it has been taken out, not returned in, and today is after the due in date
  overdueIn(booking: any): boolean {
    return booking.out_date && ! booking.in_date && this.today >= booking.due_in_date;
  }

  // analyse bookings to determine the in/out status of the asset (must be correct user)
  getStatus(bookings: any[]): any {
    for (let booking of bookings) {
      if (booking.user_id != this.user.user_id && this.user.role != ADMIN_ROLE) {
        continue;
      }
      if (this.overdueIn(booking)) {
        return {out: true, overdue: true, book: this.book.bind(this)};
      }
      if (this.isOut(booking)) {
        return {out: true, book: this.book.bind(this)};
      }
      if (this.overdueOut(booking)) {
        return {out: false, overdue: true, book: this.book.bind(this)};
      }
    }
    return {book: () => {}};
  }

  canEditProject(booking: any): boolean {
    return ! this.editing || this.canDelete(booking);
  }

  canEditDueOutDate(booking: any): boolean {
    return ! this.editing || this.canDelete(booking);
  }

  canEditDueInDate(booking: any): boolean {
    return ! this.editing || this.canEdit(booking);
  }

  canEdit(booking: any): boolean {
    let role: boolean = this.user.role == ADMIN_ROLE || this.user.user_id == booking.user_id;
    return booking.in_date == undefined && role;
  }

  canDelete(booking: any): boolean {
    let role: boolean = this.user.role == ADMIN_ROLE || this.user.user_id == booking.user_id;
    return booking.out_date == undefined && booking.in_date == undefined && role;
  }

  onEdit(booking: any) {
    this.booking = Object.assign({}, booking);
    this.editing = true;
  }

  onDelete(booking: any) {
    this.dataService.deleteBooking(booking)
                    .subscribe(() => {
                      this._asset = this.asset; // this to just force a reload of the table
                    });
  }

  onSubmit() {
    let editFields = undefined;
    if (this.editing) {
      editFields = {};
      if (this.canEditProject(this.booking)) editFields.project = true;
      if (this.canEditDueOutDate(this.booking)) editFields.dueOutDate = true;
      if (this.canEditDueInDate(this.booking)) editFields.dueInDate = true;
    }
    this.dataService.updateBooking(this.asset, this.booking, editFields)
                    .subscribe(booking => {
                      this.clash = booking.booking_id ? booking : undefined;
                      if (! this.clash) {
                        $('#bookingModal').modal('hide');
                        this.editing = false;
                        this._asset = this.asset; // this to just force a reload of the table
                      }
                    });
  }

  //FIXME the following three methods are similar as those in asset.component.ts
  options(field: string) {
    return this.enumService.get(field).options(false, true);
  }

  onEnumChange(input) {
    if (this.booking.project == LAST_OPTION.value) {
      this.addNew.field = input.field;
      this.addNew.label = undefined;
      setTimeout(() => this.addNewInput.first.nativeElement.focus());
    }
  }

  onAddNew(input, label) {
    if (label) {
      this.enumService.addNewLabel(input.field, label)
                      .subscribe(enumValue => {
                        this.booking.project = enumValue.value;
                        delete this.addNew.field;
                      });
    } else {
      this.booking.project = undefined;
      delete this.addNew.field;
    }
  }
}
