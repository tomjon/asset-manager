import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { FieldMap } from './field-map';
import { EnumPipe } from './enum.pipe';
import { Enum } from './enum';
import { Search } from './search';
import { User, ADMIN_ROLE } from './user';

@Component({
  selector: 'badass-enumerations',
  template: `<div id="enumerationsModal" class="modal fade" role="dialog">
               <form role="form" #form="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h3 class="modal-title">Enumeration Manager</h3>
                     </div>
                     <div class="modal-body">
                       <div class="form-group">
                         <label for="enumeration">Enumeration</label>
                         <select class="form-control" [(ngModel)]="field" name="enumeration" (ngModelChange)="onSelect()">
                           <option selected disabled hidden [value]="undefined">-- select an enumeration --</option>
                           <option *ngFor="let i of fieldMap.enumInputs" [value]="i.field">{{i.label}}</option>
                         </select>
                       </div>
                       <div class="form-group" [ngClass]="{disabled: field == undefined}">
                         <label for="values">Values <span *ngIf="field != undefined">({{size}})</span></label>
                         <select multiple class="form-control" name="values" [size]="size" [(ngModel)]="values">
                           <option *ngFor="let o of options" [value]="o.value">{{o.label}}</option>
                         </select>
                         <span class="glyphicon glyphicon-arrow-up" [ngClass]="{disabled: values.length != 1 || index < 1}" (click)="shift(-1)"></span>
                         <span class="glyphicon glyphicon-arrow-down" [ngClass]="{disabled: values.length != 1 || index + 1 >= options.length}" (click)="shift(1)"></span>
                         <span class="glyphicon glyphicon-refresh" [ngClass]="{disabled: values.length <= 1}" (click)="rotate(1)"></span>
                         <span class="glyphicon glyphicon-refresh flip" [ngClass]="{disabled: values.length <= 1}" (click)="rotate(-1)"></span>
                         <span class="glyphicon glyphicon-pencil" [ngClass]="{disabled: values.length != 1}" [attr.data-toggle]="values.length == 1 ? 'modal' : null" [attr.data-target]="values.length == 1 ? '#editModal' : null" (click)="onEdit()"></span>
                         <span class="glyphicon glyphicon-plus-sign" [ngClass]="{disabled: field == undefined}" [attr.data-toggle]="field != undefined ? 'modal' : null" [attr.data-target]="field != undefined ? '#editModal' : null" (click)="onNew()"></span>
                       </div>
                     </div>
                     <div class="modal-footer">
                       <p class="info"><span class="glyphicon glyphicon-info-sign"></span> Save or Reset to Prune or Sort</p>
                       <button type="button" class="btn btn-default" (click)="onPrune()" [disabled]="field == undefined || field == 'user' || ! pristine">Prune</button>
                       <button type="button" class="btn btn-default" (click)="onSort()" [disabled]="field == undefined || ! pristine">Sort</button>
                       <button type="button" class="btn btn-default" (click)="onSelect()" [disabled]="field == undefined || pristine">Reset</button>
                       <button type="button" class="btn btn-default" (click)="onSave()" [disabled]="field == undefined || pristine">Save</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>
             <div id="editModal" class="modal fade" role="dialog">
               <form role="form" #form="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h4 class="modal-title">{{isNew ? 'New' : 'Edit'}} Label</h4>
                    </div>
                    <div class="modal-body">
                      <div class="form-group">
                        <label for="label">Label</label>
                        <input type="text" required="true" class="form-control" [(ngModel)]="label" name="label" #f_label="ngModel"/>
                      </div>
                      <div *ngIf="! f_label.valid" class="alert alert-danger">
                        Label can not be blank
                      </div>
                      <div *ngIf="clash" class="alert alert-danger">
                        That label already exists
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button type="button" class="btn btn-default" data-dismiss="modal" (click)="onSubmit()" [disabled]="! form.form.valid || clash">Submit</button>
                      <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                    </div>
                  </div>
                </div>
              </form>
            </div>`,
  styles: ['.flip { transform: scale(-1, 1) }',
           'select { margin-bottom: 10px }',
           '.glyphicon:not(.disabled) { cursor: pointer }',
           '.disabled { color: lightgrey }',
           '.info { float: left }']
})
export class EnumerationsComponent {
  @Input('search') search: Search;

  @ViewChild('form') form: HTMLFormElement;

  pristine: boolean;
  field: string;
  options: any[] = [];
  values: number[] = []; // selected values
  label: string; // label currently being edited
  isNew: boolean; // whether to show 'New Label' dialog (true), or 'Edit Label' (false)

  constructor(private dataService: DataService, private enumService: EnumService, private fieldMap: FieldMap) {}

  onSelect() {
    this.options = this.enumService.get(this.field).options(false, false);
    this.pristine = true;
  }

  onEdit() {
    if (this.values.length != 1) return;
    this.isNew = false;
    for (let option of this.options) {
      if (option.value == this.values[0]) {
        this.label = option.label;
        break;
      }
    }
  }

  onNew() {
    this.isNew = true;
    this.label = '';
  }

  onSubmit() {
    if (this.isNew) {
      this.pristine = false;
      let value = 0;
      for (let option of this.options) {
        value = Math.max(value, option.value);
      } //FIXME this kind of thing pushes towards having an Options class
      ++value;
      this.options.push({label: this.label, value: value});
      this.values = [value];
      return;
    }
    for (let option of this.options) {
      if (option.value == this.values[0]) {
        if (option.label != this.label) {
          this.pristine = false;
        }
        option.label = this.label;
        break;
      }
    }
  }

  get clash(): boolean {
    for (let option of this.options) {
      if (option.value != this.values[0] && option.label == this.label) {
        return true;
      }
    }
    return false;
  }

  get size(): number {
    return this.options.length;
  }

  get index(): number {
    return this.options.findIndex(o => o.value == this.values[0]);
  }

  shift(offset: number): void {
    if (this.values.length != 1) return;
    let index = this.index;
    if (index + offset < 0 || index + offset >= this.options.length) return;
    let option = this.options.splice(index, 1)[0];
    this.options.splice(index + offset, 0, option);
    this.pristine = false;
  }

  rotate(offset: number): void {
    if (this.values.length <= 1) return;
    let value = this.values[offset == 1 ? 0 : this.values.length - 1];
    let index0 = this.options.findIndex(o => o.value == value);
    let option = this.options[index0];
    for (let i = offset == 1 ? this.values.length - 1 : 0; i >= offset && i < this.values.length + offset; i -= offset) {
      let index1 = this.options.findIndex(o => o.value == this.values[i]);
      this.options[index0] = this.options[index1];
      index0 = index1;
    }
    this.options[index0] = option;
    this.pristine = false;
  }

  onPrune() {
    this.dataService.pruneEnumeration(this.field)
                    .subscribe(values => {
                      this.enumService.get(this.field).update(values);
                      this.onSelect();
                      this.search.reload_enums = true;
                    });
    this.pristine = true;
  }

  onSort() {
    this.dataService.sortEnumeration(this.field)
                    .subscribe(values => {
                      this.enumService.get(this.field).update(values);
                      this.onSelect();
                      this.search.reload_enums = true;
                    });
  }

  onSave() {
    let e: Enum = this.enumService.get(this.field);
    e.orderFromOptions(this.options);
    this.dataService.saveEnumeration(this.field, e.values)
                    .subscribe(() => {
                      this.search.reload_enums = true;
                      this.pristine = true;
                    });
  }
}
