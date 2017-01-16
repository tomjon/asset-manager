import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { EnumPipe } from './enum.pipe';
import { LAST_OPTION } from './enum';

@Component({
  selector: 'bams-booking',
  template: `<div id="bookingModal" class="modal fade" role="dialog">
               <form role="form" #form="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" (click)="onDismiss()" data-dismiss="modal">&times;</button>
                       <h4 class="modal-title">New Booking for <b *ngIf="asset.id_number != undefined">{{asset.id_number}}</b> <i *ngIf="asset.manufacturer != undefined">{{asset.manufacturer | enum:'manufacturer'}} </i>{{asset.model}}</h4>
                     </div>
                     <div class="modal-body">
                       <div class="form-group">
                         <label for="project">Project</label>
                         <input type="text" class="form-control" [(ngModel)]="project" name="project" #f_project="ngModel">
                         <div [hidden]="f_project.valid" class="alert alert-danger">
                           Project is required
                         </div>
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

  project: number;
  dueOutDate: string;
  dueInDate: string;

  constructor(private enumService: EnumService, private dataService: DataService) {}

  onSubmit() {
    this.dataService.addBooking(this.asset, this.project, this.dueOutDate, this.dueInDate, {})
                    .subscribe();
  }
}
