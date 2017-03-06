import { Component, Input, Output, EventEmitter } from '@angular/core';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { EnumPipe } from './enum.pipe';
import { User, ADMIN_ROLE } from './user';
import { Booking } from './booking';

@Component({
  selector: 'badass-booking-table',
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
                   <tr *ngFor="let booking of bookings" [ngClass]="{current: booking.current}">
                     <td class="row">{{booking.user_id | enum:"user"}}</td>
                     <td class="row">{{booking.project | enum:"project"}}</td>
                     <td class="row" [ngClass]="{good: booking.isOut || booking.backIn, overdue: booking.overdueOut}">{{booking.due_out_date | date:'dd/MM/yyyy'}}</td>
                     <td class="row" [ngClass]="{good: booking.backIn, overdue: booking.overdueIn}">{{booking.due_in_date | date:'dd/MM/yyyy'}}</td>
                     <td>
                       <span *ngIf="booking.canEdit(user)" class="glyphicon glyphicon-pencil" (click)="onEdit(booking)" data-toggle="modal" data-target="#bookingModal"></span>
                       <span *ngIf="booking.canDelete(user)" class="glyphicon glyphicon-trash" (click)="onDelete(booking)"></span>
                     </td>
                   </tr>
                 </tbody>
               </table>
             </div>`,
  styles: ['th, td { padding: 5px }',
           '.good { color: green }',
           '.overdue { color: red }',
           '.current .row { background: lightgrey }',
           '.glyphicon { cursor: pointer }']
})
export class BookingTableComponent {
  @Input('bookings') bookings: Booking[];

  @Input('user') user: User;

  @Output('event') event = new EventEmitter<any>();

  constructor(private enumService: EnumService, private dataService: DataService) {}

  onEdit(booking: Booking) {
    this.event.emit({editBooking: Object.assign(new Booking(), booking)});
  }

  onDelete(booking: Booking) {
    this.dataService.deleteBooking(booking)
                    .subscribe(() => {
                      this.bookings.splice(this.bookings.indexOf(booking), 1);
                    });
  }
}
