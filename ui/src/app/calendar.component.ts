import { Component, Input, ViewChild } from '@angular/core';
import { Booking, Bookings } from './booking';
import { EnumService } from './enum.service';
import { CalendarComponent as FullCalendarComponent } from 'angular2-fullcalendar/src/calendar/calendar';

@Component({
  selector: 'badass-calendar',
  template: `<angular2-fullcalendar #full [options]="options"></angular2-fullcalendar>`
})
export class CalendarComponent {
  options: any = {
    height: 'auto',
    fixedWeekCount: false,
    events: []
  };

  @ViewChild('full') fullCalendar: FullCalendarComponent;

  constructor(private enumService: EnumService) {}

  @Input('bookings') set _bookings(bookings: Bookings) {
    this.options.events.length = 0;
    for (let booking of bookings) {
      this.options.events.push({
        id: booking.booking_id,
        title: this.enumService.get('project').label(booking.project),
        start: booking.due_out_date,
        end: booking.due_in_date
      });
    }
    this.fullCalendar.fullCalendar('removeEventSource', this.options.events);
    this.fullCalendar.fullCalendar('addEventSource', this.options.events);
  }
}
