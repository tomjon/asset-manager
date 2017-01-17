import { Component, Input, Output, EventEmitter } from '@angular/core';
import { EnumService } from './enum.service';
import { FIRST_OPTION } from './enum';
import { FieldMap } from './field-map';

@Component({
  selector: 'badass-filter',
  template: `<div class="panel panel-default filter">
               <b>{{filter.label}}</b>
               <select *ngIf="filter.type == 'enum'" [(ngModel)]="filter.value" (ngModelChange)="eventEmitter.emit({})">
                 <option value="">&lt;any&gt;</option>
                 <option value="-">&lt;none&gt;</option>
                 <option *ngFor="let option of options(filter.field)" [value]="option.value">{{option.label}}</option>
               </select>
               <input *ngIf="filter.type == 'text'" type="text" [(ngModel)]="filter.value" (ngModelChange)="eventEmitter.emit({})"/>
               <span (click)="eventEmitter.emit({close:true})" class="glyphicon glyphicon-remove-circle"></span>
             </div>`,
  styles: ['.filter { background: lightgreen; display: inline; padding: 5px; margin: 5px }']
})
export class FilterComponent {
  @Input('filter') filter: any;
  @Output('event') eventEmitter: EventEmitter<any> = new EventEmitter();

  constructor(private fieldMap: FieldMap, private enumService: EnumService) {}

  options(field: string) {
    return this.enumService.get(field).options(false);
  }
}
