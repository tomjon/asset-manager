import { Component, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { Booking, Bookings } from './booking';
import { User } from './user';
import { EnumService } from './enum.service';
import { CalendarComponent as FullCalendarComponent } from 'angular2-fullcalendar/src/calendar/calendar';
import * as moment from 'moment';

declare var $;

@Component({
  selector: 'badass-calendar',
  template: `<angular2-fullcalendar #full [options]="options"></angular2-fullcalendar>
             <p class="info"><span class="glyphicon glyphicon-info-sign"></span> Click and drag on the calendar to make a booking for that time period, or click on a booking to edit</p>`,
  styles: ['angular2-fullcalendar { display: block; margin-bottom: 10px }']
})
export class CalendarComponent {
  options: any = {
    height: 'auto',
    fixedWeekCount: false,
    selectable: true,
    selectOverlap: false,
    select: this.select.bind(this),
    eventClick: this.eventClick.bind(this),
    eventRender: (event, element) => element.attr('title', event.tooltip),
    events: []
  };

  @ViewChild('full') fullCalendar: FullCalendarComponent;

  constructor(private enumService: EnumService) {}

  @Output('event') event = new EventEmitter<any>();

  @Input() user: User;
  @Input() booking: Booking;

  @Input('bookings') set _bookings(bookings: Bookings) {
    this.options.events.length = 0;
    this.options.events.push({start: '1970-01-01', end: moment(), allDay: true, rendering: 'background', backgroundColor: 'red'});
    for (let booking of bookings) {
      let user = this.enumService.get('user').label(booking.user_id);
      let project = this.enumService.get('project').label(booking.project)
      this.options.events.push({
        id: booking.booking_id,
        booking: booking,
        title: `${user} | ${project}`,
        start: booking.due_out_date,
        end: moment(booking.due_in_date).add(1, 'days'),
        allDay: true,
        tooltip: booking.notes
      });
    }
    this.fullCalendar.fullCalendar('removeEventSource', this.options.events);
    this.fullCalendar.fullCalendar('addEventSource', this.options.events);
  }

  select(start: moment.Moment, end: moment.Moment) {
    this.booking.due_out_date = start.format();
    this.booking.due_in_date = end.subtract(1, 'days').format();
    this.event.emit({book: true});
    $('#bookingModal').modal('show');
  }

  eventClick(event: any) {
    if (event.booking.canEdit(this.user)) {
      this.event.emit({editBooking: event.booking});
      $('#bookingModal').modal('show');
    }
  }
}
