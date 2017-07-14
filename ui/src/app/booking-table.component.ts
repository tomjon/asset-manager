import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
import { EnumPipe } from './enum.pipe';
import { User, ADMIN_ROLE } from './user';
import { Booking, Bookings } from './booking';
import { DateRange } from './date-range';

@Component({
  selector: 'badass-booking-table',
  template: `<div>
               <div class="controls">
                 <label htmlFor="useRange">Range</label>
                 <input type="checkbox" name="useRange" [(ngModel)]="range.use" (change)="onRange()"/>
                 <span [ngClass]="{disabled: ! range.use}">
                   <input type="date" name="from" [disabled]="! range.use" [(ngModel)]="range.from" (change)="onRange()"/>
                   <label>to</label>
                   <input type="date" name="to" [disabled]="! range.use" [(ngModel)]="range.to" (change)="onRange()"/>
                 </span>
                 <div *ngIf="range.use && range.to < range.from" class="alert alert-danger">
                   'To' date must not be before the 'From' date
                 </div>
               </div>
               <table *ngIf="bookings != undefined">
                 <thead>
                   <tr>
                     <th *ngIf="! bookings.isByAsset">&nbsp;</th>
                     <th *ngIf="! bookings.isByUser">User</th>
                     <th *ngIf="! bookings.isByAsset">Manufacturer</th>
                     <th *ngIf="! bookings.isByAsset">Model</th>
                     <th *ngIf="! bookings.isByAsset">Bar&nbsp;Code</th>
                     <th *ngIf="! bookings.isByProject">Project</th>
                     <th>Due Out</th>
                     <th *ngIf="! bookings.isByAsset">Checked Out</th>
                     <th>Due In</th>
                     <th *ngIf="! bookings.isByAsset">Checked In</th>
                     <th><input type="checkbox" [(ngModel)]="allSelected" (click)="onSelectAll()"/></th>
                     <th>&nbsp;</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr *ngIf="bookings.length == 0">
                     <td colspan="6">No <span *ngIf="range.use">bookings in range</span><span *ngIf="! range.use">future bookings</span></td>
                   </tr>
                   <tr *ngFor="let booking of bookings" [ngClass]="{current: booking.current}" [title]="booking.notes || '[no notes]'">
                     <td *ngIf="! bookings.isByAsset"><span class="glyphicon glyphicon-link" (click)="onClick(booking.asset_id)" data-dismiss="modal"></span></td>
                     <td *ngIf="! bookings.isByUser">{{booking.user_id | enum:"user"}}</td>
                     <td *ngIf="! bookings.isByAsset">{{booking.manufacturer | enum:"manufacturer"}}</td>
                     <td *ngIf="! bookings.isByAsset">{{booking.model}}</td>
                     <td *ngIf="! bookings.isByAsset">{{booking.barcode}}</td>
                     <td *ngIf="! bookings.isByProject" class="project">{{booking.project | enum:"project"}}</td>
                     <td>
                       <span [ngClass]="{good: booking.isOut || booking.backIn, overdue: booking.overdueOut}">{{booking.due_out_date | date:'dd/MM/yyyy'}}</span>
                       <span *ngIf="bookings.isByAsset && booking.out_date > booking.due_out_date"><br>({{booking.out_date | date:'dd/MM/yyyy'}})</span>
                     </td>
                     <td *ngIf="! bookings.isByAsset">{{booking.out_date | date:'dd/MM/yyyy'}}</td>
                     <td>
                       <span [ngClass]="{good: booking.backIn, overdue: booking.overdueIn}">{{booking.due_in_date | date:'dd/MM/yyyy'}}</span>
                       <span *ngIf="bookings.isByAsset && booking.in_date > booking.due_in_date"><br>({{booking.in_date | date:'dd/MM/yyyy'}})</span>
                     </td>
                     <td *ngIf="! bookings.isByAsset">{{booking.in_date | date:'dd/MM/yyyy'}}</td>
                     <td class="icons"><input type="checkbox" [(ngModel)]="selected[booking.booking_id]"/></td>
                     <td class="icons">
                       <span *ngIf="booking.canEdit(user)" class="glyphicon glyphicon-pencil" (click)="onEdit(booking)" data-dismiss="modal" data-toggle="modal" data-target="#bookingModal"></span>
                       <span *ngIf="booking.canDelete(user)" class="glyphicon glyphicon-trash" (click)="onDelete(booking)"></span>
                       <span *ngIf="bookings.canCheckOut(user, booking)" class="glyphicon glyphicon-export" (click)="onCheck(booking, true)" [ngClass]="{overdue: booking.overdueOut}"></span>
                       <span *ngIf="booking.canCheckIn(user)" class="glyphicon glyphicon-import" (click)="onCheck(booking, null)" data-dismiss="modal" data-toggle="modal" data-target="#conditionModal" [ngClass]="{overdue: booking.overdueIn}"></span>
                     </td>
                   </tr>
                   <tr *ngIf="selectedCount > 1">
                     <td colspan="8"></td>
                     <td colspan="2" align="right">{{selectedCount}} bookings</td>
                     <td>
                       <span *ngIf="canEditGroup" class="glyphicon glyphicon-pencil" (click)="onEditGroup()" data-dismiss="modal" data-toggle="modal" data-target="#bookingModal"></span>
                       <span *ngIf="canDeleteGroup" class="glyphicon glyphicon-trash" (click)="onDeleteGroup()"></span>
                       <span *ngIf="canCheckOutGroup" class="glyphicon glyphicon-export" (click)="onCheckGroup(true)" [ngClass]="{overdue: overdueOutGroup}"></span>
                       <span *ngIf="canCheckInGroup" class="glyphicon glyphicon-import" (click)="onCheckGroup(null)" data-dismiss="modal" data-toggle="modal" data-target="#conditionModal" [ngClass]="{overdue: overdueInGroup}"></span>
                     </td>
                   </tr>
                 </tbody>
               </table>
             </div>`,
  styles: ['tr { margin-top: 2px; margin-bottom: 2px }',
           'th, td { padding: 5px; white-space: nowrap; vertical-align: top }',
           '.good { color: green }',
           '.overdue { color: red }',
           '.current td:not(.icons) { background: lightblue }',
           'td a { cursor: pointer }',
           '.overdue { color: red }',
           '.controls { margin-bottom: 10px }',
           '.controls input[type=checkbox] { margin-right: 20px }',
           '.controls input[type=date] { width: 130px }',
           '.disabled { color: lightgrey }',
           '.project { max-width: 250px; overflow: hidden }']
})
export class BookingTableComponent {
  @Input('bookings') bookings: Bookings;
  @Input('user') user: User;
  @Input('range') range: DateRange;

  @Output('event') event = new EventEmitter<any>();

  selected: any = { };
  allSelected: boolean = false;

  constructor(private dataService: DataService) {}

  onRange() {
    this.event.emit({range: {asset_id: this.bookings.asset_id, user: this.bookings.isByUser}});
  }

  onEdit(booking: Booking) {
    this.event.emit({editBooking: Object.assign(new Booking(), booking)});
  }

  onDelete(booking: Booking) {
    this.dataService.deleteBooking(booking.booking_id)
                    .subscribe(() => {
                      this.bookings.splice(this.bookings.indexOf(booking), 1);
                    });
  }

  onCheck(booking: Booking, out: boolean) {
    this.event.emit({check: {booking: booking, out: out, user: this.user}})
  }

  onClick(asset_id: string) {
    this.dataService.getAsset(asset_id)
                    .subscribe(asset => this.event.emit({asset: asset}));
  }

  // group selection:

  get selectedCount(): number {
    return Object.keys(this.selected).filter(id => this.selected[id] === true).length;
  }

  onSelectAll() {
    if (! this.allSelected) {
      for (let booking of this.bookings) {
        this.selected[booking.booking_id] = true;
      }
    } else {
      this.selected = { };
    }
  }

  canGroup(f): boolean {
    for (let booking_id in this.selected) {
      if (this.selected[booking_id] !== true) continue;
      let booking = this.bookings.find(b => b.booking_id == booking_id);
      if (booking == undefined) continue;
      if (! f(booking)) return false;
    }
    return true;
  }

  get canEditGroup(): boolean {
    return this.canGroup(b => b.canEdit(this.user));
  }

  get canDeleteGroup(): boolean {
    return this.canGroup(b => b.canDelete(this.user));
  }

  get canCheckOutGroup(): boolean {
    return this.canGroup(b => this.bookings.canCheckOut(this.user, b));
  }

  get canCheckInGroup(): boolean {
    return this.canGroup(b => b.canCheckIn(this.user));
  }

  get bookingGroup(): Booking[] {
    let bs = [];
    for (let booking_id in this.selected) {
      if (this.selected[booking_id] !== true) continue;
      bs.push(Object.assign(new Booking(), this.bookings.find(b => b.booking_id == booking_id)));
    }
    return bs;
  }

  onEditGroup() {
    this.event.emit({editBookingGroup: this.bookingGroup});
  }

  onDeleteGroup() {
    //FIXME consider adding group bookings delete in server API?
    for (let booking_id in this.selected) {
      this.dataService.deleteBooking(booking_id)
                      .subscribe(() => {
                        this.bookings.splice(this.bookings.findIndex(b => b.booking_id == booking_id), 1);
                        delete this.selected[booking_id];
                      });
    }
  }

  onCheckGroup(out: boolean) {
    this.event.emit({checkGroup: {bookings: this.bookingGroup, out: out, user: this.user}})
  }
}
