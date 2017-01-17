import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { EnumPipe } from './enum.pipe';
import { LAST_OPTION } from './enum';
import { PROJECT } from './field-map';

@Component({
  selector: 'bams-booking',
  template: `<div id="bookingModal" class="modal fade" role="dialog">
               <form role="form" #form="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h4 class="modal-title">New Booking for <b *ngIf="asset.id_number != undefined">{{asset.id_number}}</b> <i *ngIf="asset.manufacturer != undefined">{{asset.manufacturer | enum:'manufacturer'}} </i>{{asset.model}}</h4>
                     </div>
                     <div class="modal-body">
                       <div class="form-group">
                         <label for="project">{{project.label}}</label>
                         <select *ngIf="addNew.field != project.field" class="form-control" [(ngModel)]="project.value" [name]="project.field" (ngModelChange)="onEnumChange(project)">
                           <option *ngFor="let o of options(project.field)" [value]="o.value">{{o.label}}</option>
                         </select>
                         <input #addNew type="text" *ngIf="addNew.field == project.field" class="form-control" [(ngModel)]="addNew.label" [name]="project.field" (blur)="onAddNew(project, addNew.label)" (change)="onAddNew(project, addNew.label)"/>
                       </div>
                       <div class="form-group">
                         <label for="dueOutDate">Due Out Date</label>
                         <input type="date" required class="form-control" [(ngModel)]="dueOutDate" name="dueOutDate" #f_dueOutDate="ngModel">
                         <div [hidden]="f_dueOutDate.valid" class="alert alert-danger">
                           Due out date is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="dueInDate">Due In Date</label>
                         <input type="date" required class="form-control" [(ngModel)]="dueInDate" name="dueInDate" #f_dueInDate="ngModel">
                         <div [hidden]="f_dueInDate.valid && dueInDate >= dueOutDate" class="alert alert-danger">
                           Due in date is required, and should be the same or after the due out date
                         </div>
                       </div>
                     </div>
                     <div class="modal-footer">
                       <button type="button" class="btn btn-default" (click)="onSubmit()" data-dismiss="modal" [disabled]="! form.form.valid">Submit</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Dismiss</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>`,
  pipes: [EnumPipe]
})
export class BookingComponent {
  @Input('asset') asset: any;

  project: any = PROJECT;
  dueOutDate: string;
  dueInDate: string;

  addNew: any = {};
  @ViewChildren('addNew') addNewInput: QueryList<ElementRef>;

  constructor(private enumService: EnumService, private dataService: DataService) {}

  onSubmit() {
    this.dataService.addBooking(this.asset, this.project.value, this.dueOutDate, this.dueInDate, {})
                    .subscribe();
  }

  //FIXME the following three methods are similar as those in asset.component.ts
  options(field: string) {
    return this.enumService.get(field).options().splice(1);
  }

  onEnumChange(input) {
    if (input.value == LAST_OPTION.value) {
      this.addNew.field = input.field;
      this.addNew.label = undefined;
      setTimeout(() => this.addNewInput.first.nativeElement.focus());
    }
  }

  onAddNew(input, label) {
    if (label) {
      this.enumService.addNewLabel(input.field, label)
                      .subscribe(enumValue => {
                        input.value = enumValue.value;
                        delete this.addNew.field;
                      });
    } else {
      input.value = undefined;
      delete this.addNew.field;
    }
  }
}
