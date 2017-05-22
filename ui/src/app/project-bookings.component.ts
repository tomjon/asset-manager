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
                     <h4 *ngIf="showActive">
                       {{active ? "Active" : "Inactive"}}
                       <span class="glyphicon glyphicon-plus-sign" [ngClass]="{disabled: active}" title="Activate" (click)="onActiveState(true)"></span>
                       <span class="glyphicon glyphicon-minus-sign" [ngClass]="{disabled: ! active}" title="Deactivate" (click)="onActiveState(false)"></span>
                     </h4>
                     <badass-booking-table [user]="user" [range]="range" [bookings]="bookings" (event)="onBookingEvent($event)"></badass-booking-table>
                   </div>
                   <div class="modal-footer">
                     <p class="info"><span class="glyphicon glyphicon-info-sign"></span> Hover over a booking for notes</p>
                     <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                   </div>
                 </div>
               </div>
             </div>`,
  styles: ['h4 { margin-left: 20px; margin-bottom: 20px; white-space: nowrap; margin-right: 20px }']
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

  get showActive(): boolean {
    return this.user.role == ADMIN_ROLE;
  }

  onActiveState(state: boolean) {
    if (this.user.role != ADMIN_ROLE) return;
    this.dataService.setProjectActiveState(this.project_id, state)
                    .subscribe(() => this.active = state);
  }
}
