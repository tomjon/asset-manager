import { Component, Input, Output, EventEmitter } from '@angular/core';
import { User } from './user';
import { Bookings } from './booking';

declare var $;

@Component({
  selector: 'badass-user-bookings',
  template: `<div id="userBookingsModal" class="modal fade" role="dialog">
               <form role="form" #form="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h4 class="modal-title">Current bookings for <b>{{user.label}}</b></h4>
                     </div>
                     <div class="modal-body">
                       <badass-booking-table [user]="user" [bookings]="bookings" (event)="onBookingEvent($event)"></badass-booking-table>
                     </div>
                     <div class="modal-footer">
                       <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>`
})
export class UserBookingsComponent {
  @Input('user') user: User;
  @Input('bookings') bookings: Bookings;

  @Output('event') event = new EventEmitter<any>();

  onBookingEvent(event: any) {
    this.event.emit(event);
  }
}
