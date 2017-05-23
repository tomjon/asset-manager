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
                     <td class="icons">
                       <span *ngIf="booking.canEdit(user)" class="glyphicon glyphicon-pencil" (click)="onEdit(booking)" data-dismiss="modal" data-toggle="modal" data-target="#bookingModal"></span>
                       <span *ngIf="booking.canDelete(user)" class="glyphicon glyphicon-trash" (click)="onDelete(booking)"></span>
                       <span *ngIf="bookings.canCheckOut(user, booking)" class="glyphicon glyphicon-export" (click)="onCheck(booking, true)" [ngClass]="{overdue: booking.overdueOut}"></span>
                       <span *ngIf="booking.canCheckIn(user)" class="glyphicon glyphicon-import" (click)="onCheck(booking, null)" data-dismiss="modal" data-toggle="modal" data-target="#conditionModal" [ngClass]="{overdue: booking.overdueIn}"></span>
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

  constructor(private dataService: DataService) {}

  onRange() {
    this.event.emit({range: {asset_id: this.bookings.asset_id, user: this.bookings.isByUser}});
  }

  onEdit(booking: Booking) {
    this.event.emit({editBooking: Object.assign(new Booking(), booking)});
  }

  onDelete(booking: Booking) {
    this.dataService.deleteBooking(booking)
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
}
