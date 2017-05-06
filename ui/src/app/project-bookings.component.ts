import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
import { Enum } from './enum';
import { User, ANONYMOUS, ADMIN_ROLE } from './user';
import { Bookings } from './booking';
import { DateRange } from './date-range';

@Component({
  selector: 'badass-project-bookings',
  template: `<div id="projectBookingsModal" class="modal fade" role="dialog">
               <div class="modal-dialog">
                 <div class="modal-content">
                   <div class="modal-header">
                     <button type="button" class="close" data-dismiss="modal">&times;</button>
                     <h4 class="modal-title">Project <select [(ngModel)]="project_id" (ngModelChange)="onSelect()"><option *ngFor="let o of options('project')" [value]="o.value">{{o.label}}</option></select></h4>
                   </div>
                   <div class="modal-body" *ngIf="project_id != undefined">
                     <h4>{{active ? "Active" : "Inactive"}} <span *ngIf="showDisactivate" class="glyphicon glyphicon-minus-sign" title="Disactivate" (click)="onDisactivate()"></span></h4>
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
           'h4 { margin-left: 20px; margin-bottom: 20px }',
           '.info { float: left }',
           '.glyphicon { cursor: pointer }']
})
export class ProjectBookingsComponent {
  private project_id: string;
  private bookings: Bookings;
  private active: boolean;

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
    if (this.user.role != ANONYMOUS && this.project_id != undefined) {
      this.dataService.getProject(this.project_id, this.range)
                      .subscribe(values => {
                        this.active = values.project.active;
                        this.bookings = values.bookings;
                      });
    }
  }

  onBookingEvent(event: any) {
    this.event.emit(event);
  }

  get showDisactivate(): boolean {
    return this.active && this.user.role == ADMIN_ROLE;
  }

  onDisactivate() {
    if (this.user.role != ADMIN_ROLE) return;
    this.dataService.disactivateProject(this.project_id)
                    .subscribe(() => this.active = false);
  }
}
