import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
import { Enum } from './enum';
import { User, ANONYMOUS } from './user';
import { Bookings } from './booking';
import { DateRange } from './date-range';

@Component({
  selector: 'badass-project-bookings',
  template: `<div id="projectBookingsModal" class="modal fade" role="dialog">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h4 class="modal-title">Bookings for project <select [(ngModel)]="project_id" (ngModelChange)="onSelect()"><option *ngFor="let o of options('project')" [value]="o.value">{{o.label}}</option></select></h4>
                     </div>
                     <div class="modal-body">
                       <badass-booking-table [user]="user" [range]="range" [bookings]="bookings" (event)="onBookingEvent($event)"></badass-booking-table>
                     </div>
                     <div class="modal-footer">
                       <p class="info"><span class="glyphicon glyphicon-info-sign"></span> Hover over a booking for notes</p>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                     </div>
                   </div>
                 </div>
             </div>`,
  styles: ['.modal-dialog { width: 60% }',
           '.info { float: left }']
})
export class ProjectBookingsComponent {
  private project_id: string = '0';
  private bookings: Bookings;

  @Input('user') user: User;
  @Input('range') range: DateRange;

  ngOnChanges() {
    this.onSelect();
  }

  @Output('event') event = new EventEmitter<any>();

  constructor(private dataService: DataService, private enumService: EnumService) {}

  //FIXME repeat
  options(field: string) {
    let e: Enum = this.enumService.get(field);
    return e.options(false, false);
  }

  onSelect() {
    if (this.user.role != ANONYMOUS) {
      this.dataService.getProjectBookings(this.project_id, this.range)
                      .subscribe(bookings => this.bookings = bookings);
    }
  }

  onBookingEvent(event: any) {
    this.event.emit(event);
  }
}
