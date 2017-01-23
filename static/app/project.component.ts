import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { EnumPipe } from './enum.pipe';
import { User, ADMIN_ROLE } from './user';
import { LAST_OPTION } from './enum';
import { PROJECT } from './field-map';

@Component({
  selector: 'badass-project',
  template: `<div id="projectModal" class="modal fade" role="dialog">
               <form role="form" #form="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h4 class="modal-title">Project Report</h4>
                     </div>
                     <div class="modal-body">
                       <div class="form-group">
                         <label for="project">{{project.label}}</label>
                         <select *ngIf="addNew.field != project.field" class="form-control" [(ngModel)]="project.value" [name]="project.field" (ngModelChange)="onEnumChange(project)">
                           <option *ngFor="let o of options(project.field)" [value]="o.value">{{o.label}}</option>
                         </select>
                         <input #addNew type="text" *ngIf="addNew.field == project.field" class="form-control" [(ngModel)]="addNew.label" [name]="project.field" (blur)="onAddNew(project, addNew.label)" (change)="onAddNew(project, addNew.label)"/>
                       </div>
                     </div>
                     <div *ngIf="project.value">
                       <table>
                         <tr>
                           <th>Asset</th>
                           <th>User</th>
                           <th>Due Out</th>
                           <th>Due In</th>
                           <th>Out</th>
                           <th>In</th>
                         </tr>
                         <tr *ngFor="let booking of bookings">
                           <td>{{booking.asset_id}}</td>
                           <td>{{booking.label}}</td>
                           <td>{{booking.due_out_date}}</td>
                           <td>{{booking.due_in_date}}</td>
                           <td>{{booking.out_date}}</td>
                           <td>{{booking.in_date}}</td>
                         </tr>
                       </table>
                     </div>
                     <div class="modal-footer">
                       <button type="button" class="btn btn-default" data-dismiss="modal">Dismiss</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>`,
  styles: ['th, td { padding: 5px }',
           '.good { color: green }',
           '.overdue { color: red }',
           '.current .row { background: lightgrey }',
           '.glyphicon { cursor: pointer }'],
  pipes: [EnumPipe]
})
export class ProjectComponent {
  bookings: any[] = [];

  @Input('user') user: User;

  project: any = PROJECT;

  addNew: any = {};
  @ViewChildren('addNew') addNewInput: QueryList<ElementRef>;

  constructor(private enumService: EnumService, private dataService: DataService) {
    this.project.value = 0;
  }

  getBookings() {
    this.dataService.getBookingsForProject(this.project.value)
                    .subscribe(bookings => {
                      this.bookings = bookings;
                    });
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
    } else {
      this.getBookings();
    }
  }

  onAddNew(input, label) {
    this.bookings = [];
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
