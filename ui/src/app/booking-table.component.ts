import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
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
                     <th *ngIf="! bookings.isByAsset">Checked Out</th>
                     <th>Due In</th>
                     <th *ngIf="! bookings.isByAsset">Checked In</th>
                     <th>&nbsp;</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr *ngIf="bookings.length == 0">
                     <td colspan="6">No future bookings</td>
                   </tr>
                   <tr *ngFor="let booking of bookings" [ngClass]="{current: booking.current}" [title]="booking.notes || '[no notes]'">
                     <td *ngIf="! bookings.isByAsset"><span class="glyphicon glyphicon-link" (click)="onClick(booking.asset_id)" data-dismiss="modal"></span></td>
                     <td *ngIf="! bookings.isByUser">{{booking.user_id | enum:"user"}}</td>
                     <td *ngIf="! bookings.isByAsset">{{booking.manufacturer | enum:"manufacturer"}}</td>
                     <td *ngIf="! bookings.isByAsset">{{booking.model}}</td>
                     <td *ngIf="! bookings.isByAsset">{{booking.barcode}}</td>
                     <td *ngIf="! bookings.isByProject">{{booking.project | enum:"project"}}</td>
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
                       <span *ngIf="bookings.canCheckOut(booking)" class="glyphicon glyphicon-export" (click)="onCheck(booking, true)" [ngClass]="{overdue: booking.overdueOut}"></span>
                       <span *ngIf="booking.isOut" class="glyphicon glyphicon-import" (click)="onCheck(booking, null)" data-dismiss="modal" data-toggle="modal" data-target="#conditionModal" [ngClass]="{overdue: booking.overdueIn}"></span>
                     </td>
                   </tr>
                 </tbody>
               </table>
             </div>`,
  styles: ['tr { margin-top: 2px; margin-bottom: 2px }',
           'th, td { padding: 5px; white-space: nowrap; vertical-align: top }',
           '.icons { background: white }',
           '.good { color: green }',
           '.overdue { color: red }',
           '.current { background: lightblue }',
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

  onCheck(booking: Booking, out: boolean) {
    this.event.emit({check: {booking: booking, out: out, user: this.user}})
  }

  onClick(asset_id: string) {
    this.dataService.getAsset(asset_id)
                    .subscribe(asset => this.event.emit({asset: asset}));
  }
}
