import { Component, Input, Output, EventEmitter } from '@angular/core';
import { EnumService } from './enum.service';
import { FieldMap } from './field-map';

@Component({
  selector: 'bams-filter',
  template: `<div class="filter">
               <b *ngIf="! editField" (click)="onField(true)">{{filter.label}}</b>
               <select *ngIf="editField" [(ngModel)]="filter.field" (ngModelChange)="onField(false)">
                 <option *ngFor="let input of fieldMap.allInputs" [value]="input.field">{{input.label}}</option>
               </select>
               <i *ngIf="! editValue && filter.value != undefined" (click)="onValue(true)">{{valueLabel}}</i>
               <select *ngIf="filter.type == 'enum' && (editValue || filter.value == undefined)" [(ngModel)]="filter.value" (ngModelChange)="onValue(false)">
                 <option *ngFor="let option of options(filter.field)" [value]="option.value">{{option.label}}</option>
               </select>
               <input *ngIf="filter.type == 'text' && (editValue || filter.value == undefined)" type="text" [(ngModel)]="filter.value" (change)="onValue(false)"/>
               <span (click)="eventEmitter.emit({close:true})">X</span>
             </div>`,
  styles: ['.filter { background: green }']
})
export class FilterComponent {
  editField: boolean = false;
  editValue: boolean = false;

  @Input('filter') filter: any;
  @Output('event') eventEmitter: EventEmitter<any> = new EventEmitter();

  constructor(private fieldMap: FieldMap, private enumService: EnumService) {}

  options(field: string) {
    return this.enumService.get(field).options();
  }

  onField(edit: boolean) {
    this.editField = edit;
    if (! edit) {
      Object.assign(this.filter, this.fieldMap.get(this.filter.field));
      delete this.filter.value;
      this.eventEmitter.emit({});
    }
  }

  onValue(edit: boolean) {
    this.editValue = edit;
    if (! edit) this.eventEmitter.emit({});
  }

  get valueLabel(): string {
    if (this.filter.type == 'enum') {
      return this.enumService.get(this.filter.field).label(this.filter.value);
    }
    return this.filter.value;
  }
}
