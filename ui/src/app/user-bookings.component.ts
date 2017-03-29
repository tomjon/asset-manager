import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DataService } from './data.service';
import { User, ADMIN_ROLE } from './user';
import { Bookings } from './booking';
import { DateRange } from './date-range';

@Component({
  selector: 'badass-user-bookings',
  template: `<div id="userBookingsModal" class="modal fade" role="dialog">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h4 class="modal-title">Bookings for <select *ngIf="showSelect" [(ngModel)]="user_id" (ngModelChange)="onSelect()"><option *ngFor="let u of users" [value]="u.user_id">{{u.label}}</option></select><b *ngIf="! showSelect">{{user.label}}</b></h4>
                     </div>
                     <div class="modal-body">
                       <badass-booking-table [user]="user" [range]="range" [bookings]="show_bookings" (event)="onBookingEvent($event)"></badass-booking-table>
                     </div>
                     <div class="modal-footer">
                       <p class="info"><span class="glyphicon glyphicon-info-sign"></span> Hover over a booking for notes</p>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                     </div>
                   </div>
                 </div>
             </div>`,
  styles: ['.modal-dialog { width: 50% }',
           '.info { float: left }']
})
export class UserBookingsComponent {
  private user_id: string; // id of selected user, can only change if admin
  private show_bookings: Bookings; // bookings for selected user, can only change if admin

  private user: User;
  @Input('user') set _user(user: User) {
    this.user = user;
    this.user_id = this.user.user_id;
  }

  @Input('users') users: User[];

  private bookings: Bookings;
  @Input('bookings') set _bookings(bookings: Bookings) {
    this.bookings = bookings;
    this.onSelect();
  }

  private range: DateRange;
  @Input('range') set _range(range: DateRange) {
    this.range = range;
    this.onSelect();
  }

  @Output('event') event = new EventEmitter<any>();

  constructor(private dataService: DataService) {}

  onSelect() {
    if (this.user.user_id == this.user_id) {
      this.show_bookings = this.bookings;
    } else {
      this.dataService.getUserBookings(this.user_id, this.range)
                      .subscribe(bookings => this.show_bookings = bookings);
    }
  }

  onBookingEvent(event: any) {
    this.event.emit(event);
  }

  get showSelect(): boolean {
    return this.user.role >= ADMIN_ROLE;
  }
}
