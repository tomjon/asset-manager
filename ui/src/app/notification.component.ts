import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { FieldMap } from './field-map';
import { Notification } from './notification';
import { Trigger } from './trigger';
import { Filter } from './filter';
import { EnumPipe } from './enum.pipe';
import { Enum } from './enum';
import { User, ADMIN_ROLE } from './user';
import { pristine } from './pristine';
import { BOOKED_DATE } from './field-map';

@Component({
  selector: 'badass-notification',
  template: `<div id="notificationsModal" class="modal fade" role="dialog">
               <form role="form" #form="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h3 class="modal-title">Notification Manager</h3>
                     </div>
                     <div class="modal-body">
                       <div class="form-group">
                         <label for="notification">Notification</label>
                         <select class="form-control" [(ngModel)]="notification_id" name="notification" (ngModelChange)="onSelect()">
                           <option *ngFor="let o of notifications; let index=index" [value]="o.notification_id">{{index + 1}}. {{o.name}}</option>
                         </select>
                       </div>
                     </div>
                     <div class="modal-body" *ngIf="notification">
                       <div class="form-group">
                         <label for="name">Name</label>
                         <input type="text" required class="form-control" [(ngModel)]="notification.name" name="name" #f_name="ngModel">
                         <div [hidden]="f_name.valid" class="alert alert-danger">
                           Name is required
                         </div>
                       </div>
                       <div class="form-group">
                         <div class="col-lg-4 my-input-group">
                           <label for="every">Run Every ...</label>
                           <select class="form-control" [(ngModel)]="notification.every" name="every">
                             <option *ngFor="let o of everyEnum.options(false, false)" [value]="o.value">{{o.label}}</option>
                           </select>
                         </div>
                         <div class="col-lg-4 my-input-group blanker" [ngClass]="{disabled: notification.every <= 1}">
                           <label for="offset">Offset (days)</label>
                           <input type="number" required class="form-control" [disabled]="notification.every <= 1" [(ngModel)]="notification.offset" name="offset" #f_offset="ngModel">
                           <div [hidden]="notification.every <= 1 || f_offset.valid" class="alert alert-danger">
                             Offset is required
                           </div>
                         </div>
                         <div class="col-lg-4 my-input-group">
                           <label for="run">Last Run <span class="glyphicon glyphicon-remove-circle" [ngClass]="{disabled: ! notification.run}" (click)="onRunReset()"></span></label>
                           <input type="text" class="form-control" [disabled]="true" [(ngModel)]="notification.run" name="last_run">
                         </div>
                       </div>
                       <ul class="nav nav-tabs">
                         <li *ngFor="let trigger of notification.triggers; let index=index" [ngClass]="{active: trigger == activeTrigger}" (click)="activeTrigger = trigger"><a>Trigger {{index + 1}}</a></li>
                         <li><a class="glyphicon glyphicon-plus-sign" (click)="onNewTrigger()"></a></li>
                       </ul>
                       <div class="tab-content">
                         <div class="form-group">
                           <label for="triggerType">Report</label>
                           <input type="checkbox" name="triggerType" [(ngModel)]="isReport" />
                         </div>
                         <div *ngIf="activeTrigger.column != undefined || activeTrigger.field != undefined" class="form-group">
                           <div class="col-lg-4">
                             <label for="triggerColumn">Column</label>
                             <select class="form-control" [(ngModel)]="activeTrigger.column" name="triggerColumn" (ngModelChange)="activeTrigger.field = undefined">
                               <option *ngFor="let o of fieldMap.triggerColumns" [value]="o.column">{{o.label}}</option>
                             </select>
                           </div>
                           <div class="col-lg-4">
                             <label for="triggerField">Field</label>
                             <select class="form-control" [(ngModel)]="activeTrigger.field" name="triggerField" (ngModelChange)="activeTrigger.column = undefined">
                               <option *ngFor="let o of fieldMap.triggerInputs" [value]="o.field">{{o.label}}</option>
                             </select>
                           </div>
                           <div class="col-lg-4">
                             <label for="triggerDays">Offset (days)</label>
                             <input type="text" class="form-control" [(ngModel)]="activeTrigger.days" name="triggerDays">
                           </div>
                         </div>
                         &nbsp;
                         <ul class="nav nav-pills nav-stacked">
                           <li *ngFor="let filter of activeTrigger.filters; let index=index" class="active">
                             <a class="trigger-filter">
                               <span class="filter-label">Filter</span>
                               <ng-container *ngIf="filter.field == undefined || fieldMap.get(filter.field).type != 'enum'">{{filter.column != null ? filter.column : filter.field}} {{operatorLabel(filter)}} <i>{{filter.value.toUpperCase()}}</i></ng-container>
                               <ng-container *ngIf="filter.field != undefined && fieldMap.get(filter.field).type == 'enum'">{{filter.column != null ? filter.column : filter.field}} {{operatorLabel(filter)}} {{enumService.get(filter.field).label(filter.value)}}</ng-container>
                               <span class="glyphicon glyphicon-trash" (click)="onDeleteFilter(index)"></span>
                             </a>
                           </li>
                           <li class="newFilter">
                             <a>
                               <select [(ngModel)]="newFilter.column" name="newFilterColumn" (ngModelChange)="newFilter.field = undefined">
                                 <option *ngFor="let o of fieldMap.filterColumns" [value]="o.column">{{o.label}}</option>
                               </select>
                               <select [(ngModel)]="newFilter.field" name="newFilterField" (ngModelChange)="newFilter.column = undefined">
                                 <option *ngFor="let o of fieldMap.allInputs" [value]="o.field">{{o.label}}</option>
                               </select>
                               <select [(ngModel)]="newFilter.operator" name="newFilterOperator">
                                 <option *ngFor="let o of fieldMap.filterOperators" [value]="o.value">{{o.label}}</option>
                               </select>
                               <select *ngIf="newFilter.column != undefined" [(ngModel)]="newFilter.value" name="newFilterValue">
                                 <option value="null">NULL</option>
                                 <option value="now">NOW</option>
                               </select>
                               <select *ngIf="newFilter.field != undefined" [(ngModel)]="newFilter.value" name="newFilterValue">
                                 <option *ngFor="let o of options(newFilter.field)" [value]="o.value">{{o.label}}</option>
                                 <option *ngIf="fieldMap.get(newFilter.field).type != 'enum'" value="null">NULL</option>
                                 <option *ngIf="fieldMap.get(newFilter.field).type == 'date'" value="now">NOW</option>
                               </select>
                               <span class="glyphicon glyphicon-plus-sign" (click)="onNewFilter()"></span>
                             </a>
                           </li>
                         </ul>
                       </div>
                       <div class="form-group">
                         <label for="titleTemplate">Cc: Recipient Roles</label>
                         <select class="form-control" multiple [(ngModel)]="notification.roles" name="roles">
                           <option *ngFor="let o of rolesEnum.options(false, false)" [value]="o.value">{{o.label}}</option>
                         </select>
                         <div [hidden]="! showRoleAlert()" class="alert alert-danger">
                           You must specify Cc: Recipient Roles if you have asset field based triggers
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="titleTemplate">Title Template</label>
                         <input type="text" required class="form-control" [(ngModel)]="notification.title_template" name="titleTemplate" #f_titleTemplate="ngModel">
                         <div [hidden]="f_titleTemplate.valid" class="alert alert-danger">
                           Title Template is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="bodyTemplate">Body Template</label>
                         <textarea type="text" required class="form-control" [(ngModel)]="notification.body_template" name="bodyTemplate" rows="10" #f_bodyTemplate="ngModel"></textarea>
                         <div [hidden]="f_bodyTemplate.valid" class="alert alert-danger">
                           Body Template is required
                         </div>
                       </div>
                     </div>
                     <div class="modal-footer">
                       <button type="button" class="btn btn-default" (click)="onSave()" [disabled]="! form.form.valid || form.form.pristine">Save</button>
                       <button type="button" class="btn btn-default" (click)="onAddNew()" [disabled]="! canAddNew()">Add New</button>
                       <button type="button" class="btn btn-default" (click)="onDelete()">Delete</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>`,
  styles: ['.tab-content { padding: 10px; border: 1px solid lightgrey; border-top: 0px; margin-bottom: 10px }',
           '.nav-tabs a { cursor: pointer }',
           '.trigger-filter .filter-label { margin-right: 20px; font-weight: bold }',
           '.trigger-filter .glyphicon { width: 100%; text-align: right }',
           '.newFilter a { white-space: nowrap }',
           '.my-input-group { padding: 0 5px 10px 0 }',
           '.my-input-group:last-child { padding-right: 0 }',
           'label span { margin-left: 30px }',
           '.disabled { color: lightgrey; cursor: default }',
           '.blanker.disabled input { color: white }']
})
export class NotificationComponent {
  @Input('notifications') notifications: Notification[];
  notification_id: string;
  notification: Notification;
  activeTrigger: Trigger;
  newFilter: Filter = new Filter();
  rolesEnum: Enum = this.enumService.get("role");
  everyEnum: Enum = this.enumService.get("every");

  @ViewChild('form') form: HTMLFormElement;

  constructor(private dataService: DataService, private enumService: EnumService, private fieldMap: FieldMap) {}

  ngOnChanges() {
    if (this.notifications == undefined) {
      this.notification_id = undefined;
      return;
    }
    if (this.notifications.length > 0) {
      this.notification_id = this.notifications[0].notification_id;
      this.onSelect();
    } else {
      this.onAddNew();
    }
  }

  showRoleAlert(): boolean {
    for (let trigger of this.notification.triggers) {
      if (! trigger.column && this.notification.roles.length == 0) {
        return true;
      }
    }
    return false;
  }

  get isReport(): boolean {
    return this.activeTrigger.column == undefined && this.activeTrigger.field == undefined;
  }

  set isReport(value: boolean) {
    this.activeTrigger.column = value ? undefined : BOOKED_DATE.column;
    this.activeTrigger.field = undefined;
  }

  //FIXME this is copied from elsewhere... code reuse :(
  options(field: string) {
    let input = this.fieldMap.get(field);
    if (input.type != 'enum') return [];
    let e: Enum = this.enumService.get(field);
    return e.options(true, false);
  }

  onSelect() {
    this.notification = this.notifications.find(notification => notification.notification_id == this.notification_id);
    this.activeTrigger = this.notification.triggers[0];
    if (this.activeTrigger == undefined) {
      this.activeTrigger = new Trigger();
      this.notification.triggers.push(this.activeTrigger);
    }
  }

  onRunReset() {
    if (this.notification.run) {
      this.dataService.resetNotification(this.notification.notification_id)
                      .subscribe(() => this.notification.run = null);
    }
  }

  _delete() {
    let index = this.notifications.indexOf(this.notification);
    this.notifications.splice(index, 1);
    if (this.notifications.length > 0) {
      this.notification_id = this.notifications[0].notification_id;
      this.onSelect();
    } else {
      this.onAddNew();
    }
  }

  onDelete() {
    if (this.notification.notification_id != 'new') { // FIXME constant comes from notification.ts
      this.dataService.deleteNotification(this.notification.notification_id)
                      .subscribe(() => this._delete());
    } else {
      this._delete();
    }
  }

  onUpdate() {
    this.dataService.updateNotification(this.notification)
                    .subscribe(booking => {
                      this.notifications.push(this.notification);
                    });
  }

  onAddNew() {
    let notification = new Notification();
    this.notification_id = notification.notification_id;
    this.notifications.push(notification);
    this.onSelect();
  }

  _save(notification) {
    this.notification_id = this.notification.notification_id = notification.notification_id;
    pristine(this.form);
  }

  onSave() {
    if (this.notification.notification_id == 'new') { // FIXME constant comes from notification.ts
      this.dataService.addNotification(this.notification)
                      .subscribe(notification => this._save(notification));
    } else {
      this.dataService.updateNotification(this.notification)
                      .subscribe(notification => this._save(notification));
    }
  }

  onNewTrigger() {
    this.activeTrigger = new Trigger();
    this.notification.triggers.push(this.activeTrigger);
  }

  onNewFilter() {
    this.activeTrigger.filters.push(this.newFilter);
    this.newFilter = new Filter();
  }

  onDeleteFilter(index) {
    this.activeTrigger.filters.splice(index, 1);
  }

  operatorLabel(filter: any) {
    return this.fieldMap.filterOperators.find(o => o.value == filter.operator).label;
  }

  canAddNew(): boolean {
    if (this.notifications == undefined) return false;
    return this.notifications.find(notification => notification.notification_id == 'new') == undefined;
  }
}
