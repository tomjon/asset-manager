import { Component, Input, Output, EventEmitter, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
import { EnumPipe } from './enum.pipe';
import { User, ADMIN_ROLE } from './user';
import { Booking, Bookings } from './booking';
import { Search } from './search';
import { FieldMap } from './field-map';
import { LAST_OPTION } from './enum';

@Component({
  selector: 'badass-booking-condition',
  template: `<div id="conditionModal" class="modal fade" role="dialog">
               <div class="modal-dialog">
                 <div class="modal-content">
                   <div class="modal-header">
                     <button type="button" class="close" data-dismiss="modal">&times;</button>
                     <h4 class="modal-title">Update asset condition</h4>
                   </div>
                   <div class="modal-body">
                     You must update the asset condition when checking it back in.
                     <div class="form-group">
                       <label htmlFor="condition">&nbsp;</label>
                       <select *ngIf="addNew.field != fieldMap.conditionInput.field" class="form-control" [(ngModel)]="booking.condition" name="condition" (ngModelChange)="onEnumChange(fieldMap.conditionInput)">
                         <option *ngFor="let o of options(fieldMap.conditionInput.field, true, true)" [value]="o.value">{{o.label}}</option>
                       </select>
                       <input #addNew type="text" *ngIf="addNew.field == fieldMap.conditionInput.field" class="form-control" [(ngModel)]="addNew.label" name="condition" (change)="onAddNew(fieldMap.conditionInput, addNew.label)"/>
                     </div>
                   </div>
                   <div class="modal-footer">
                     <button type="button" class="btn btn-default" data-dismiss="modal" (click)="onCheckIn()">Check In</button>
                     <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                   </div>
                 </div>
               </div>
             </div>`
})
export class BookingConditionComponent {
  @Input('booking') booking;
  @Input('user') user;
  @Input('search') search;

  @Output('event') event = new EventEmitter<any>();

  // fields for condition and 'add new' functionality - FIXME: move out all add new stuff into own angular component/whatever
  @ViewChildren('addNew') addNewInput: QueryList<ElementRef>;
  addNew: any = {};

  constructor(private dataService: DataService, private enumService: EnumService, private fieldMap: FieldMap) {}

  onCheckIn() {
    this.event.emit({checkInCondition: this.booking.condition});
  }

  //FIXME add new and options stuff... need to move this out
  options(field: string) {
    let showAddNew = this.user != undefined && this.user.role >= ADMIN_ROLE;
    return this.enumService.get(field).options(true, showAddNew);
  }

  onEnumChange(input) {
    if (this.booking.condition == LAST_OPTION.value) {
      this.addNew.field = input.field;
      this.addNew.label = undefined;
      setTimeout(() => this.addNewInput.first.nativeElement.focus());
    }
  }

  onAddNew(input, label) {
    if (label) {
      this.enumService.addNewLabel(input.field, label)
                      .subscribe(enumValue => {
                        this.booking.condition = enumValue.value;
                        delete this.addNew.field;
                        this.search.reload_enums = true;
                      });
    } else {
      this.booking.condition = undefined;
      delete this.addNew.field;
    }
  }
}
