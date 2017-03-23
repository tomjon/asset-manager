import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DataService } from './data.service';
import { EnumPipe } from './enum.pipe';
import { User, ADMIN_ROLE } from './user';
import { Booking, Bookings } from './booking';

@Component({
  selector: 'badass-booking-table',
  template: `<div>
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
                     <th>Due In</th>
                     <th></th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr *ngIf="bookings.length == 0">
                     <td colspan="6">No future bookings</td>
                   </tr>
                   <tr *ngFor="let booking of bookings" [ngClass]="{current: booking.current}">
                     <td *ngIf="! bookings.isByAsset"><span class="glyphicon glyphicon-link" (click)="onClick(booking.asset_id)" data-dismiss="modal"></span></td>
                     <td *ngIf="! bookings.isByUser" class="row">{{booking.user_id | enum:"user"}}</td>
                     <td *ngIf="! bookings.isByAsset" class="row">{{booking.manufacturer | enum:"manufacturer"}}</td>
                     <td *ngIf="! bookings.isByAsset" class="row">{{booking.model}}</td>
                     <td *ngIf="! bookings.isByAsset" class="row">{{booking.barcode}}</td>
                     <td *ngIf="! bookings.isByProject" class="row">{{booking.project | enum:"project"}}</td>
                     <td class="row" [ngClass]="{good: booking.isOut || booking.backIn, overdue: booking.overdueOut}">{{booking.due_out_date | date:'dd/MM/yyyy'}}</td>
                     <td class="row" [ngClass]="{good: booking.backIn, overdue: booking.overdueIn}">{{booking.due_in_date | date:'dd/MM/yyyy'}}</td>
                     <td>
                       <span *ngIf="booking.canEdit(user)" class="glyphicon glyphicon-pencil" (click)="onEdit(booking)" data-dismiss="modal" data-toggle="modal" data-target="#bookingModal"></span>
                       <span *ngIf="booking.canDelete(user)" class="glyphicon glyphicon-trash" (click)="onDelete(booking)"></span>
                       <span *ngIf="bookings.isByUser && booking.canCheckOut" class="glyphicon glyphicon-export" (click)="onCheck(booking.asset_id, true)"></span>
                       <span *ngIf="bookings.isByUser && booking.isOut" class="glyphicon glyphicon-import" (click)="onCheck(booking.asset_id, false)" [ngClass]="{overdue: booking.overdueIn}"></span>
                     </td>
                   </tr>
                 </tbody>
               </table>
             </div>`,
  styles: ['th, td { padding: 5px; white-space: nowrap }',
           '.good { color: green }',
           '.overdue { color: red }',
           '.current .row { background: lightblue }',
           '.glyphicon, td a { cursor: pointer }',
           '.overdue { color: red }']
})
export class BookingTableComponent {
  @Input('bookings') bookings: Bookings;

  @Input('user') user: User;

  @Output('event') event = new EventEmitter<any>();

  constructor(private dataService: DataService) {}

  onEdit(booking: Booking) {
    this.event.emit({editBooking: Object.assign(new Booking(), booking)});
  }

  onDelete(booking: Booking) {
    this.dataService.deleteBooking(booking)
                    .subscribe(() => {
                      this.bookings.splice(this.bookings.indexOf(booking), 1);
                    });
  }

  onCheck(asset_id: string, out: boolean) {
    this.event.emit({check: {asset_id: asset_id, out: out, user: this.user}});
  }

  onClick(asset_id: string) {
    this.dataService.getAsset(asset_id)
                    .subscribe(asset => this.event.emit({asset: asset}));
  }
}
