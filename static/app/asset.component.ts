import { Component, Input, Output, ViewChild, EventEmitter } from '@angular/core';
import { EnumService } from './enum.service';
import { FieldMap } from './field-map';

/**
 * The component makes a copy of the input asset.
 *
 * If 'reset' is pressed, the copy is re-made from the original.
 *
 * If 'save' is pressed, the original is changed to match the copy (thus
 * affecting whereever else the original might be displayed in the UI), and an
 * output event emitted.
 *
 * If 'delete' is pressed, the fields are cleared and an output event emitted.
 *
 * If 'add new' is pressed, the user is warned that a copy of the current asset
 * is about to be made, and if they accept, an output event is emitted.
 */
@Component({
  selector: 'bams-asset',
  template: `<div class="container-fluid">
               <div class="row">
                 <div class="col-lg-8">
                   <div class="row">
                     <h2 class="col-lg-12">
                       Asset View
                       <span class="glyphicon glyphicon-arrow-left" (click)="onReset()" [ngClass]="{disabled: form.pristine}"></span>
                       <span class="glyphicon glyphicon-floppy-disk" (click)="onSave()" [ngClass]="{disabled: form.pristine || original == undefined}"></span>
                       <span class="glyphicon glyphicon-trash" (click)="onDelete()" [ngClass]="{disabled: original == undefined}"></span>
                       <span class="glyphicon glyphicon-plus-sign" (click)="onAdd()"></span>
                     </h2>
                   </div>
                   <form role="form" #form="ngForm" class="row">
                     <div *ngFor="let col of fieldMap.assetInputs" class="col-lg-6">
                       <div *ngFor="let group of col" class="form-group">
                         <div *ngFor="let input of group" [ngClass]="{'col-lg-6': group.length > 1, 'my-input-group': group.length > 1}">
                           <div *ngIf="input.type != 'area' && input.type != 'enum'">
                             <label for="input.field">{{input.label}}</label>
                             <input [type]="input.type" class="form-control" required [(ngModel)]="asset[input.field]" [name]="input.field" />
                           </div>
                           <div *ngIf="input.type == 'area'">
                             <label for="input.field">{{input.label}}</label>
                             <textarea class="form-control" required [(ngModel)]="asset[input.field]" [name]="input.field" rows="3"></textarea>
                           </div>
                           <div *ngIf="input.type == 'enum'">
                             <label for="input.field">{{input.label}}</label>
                             <select class="form-control" [(ngModel)]="asset[input.field]" [name]="input.field">
                               <option *ngFor="let o of options(input.field)" [value]="o.value">{{o.label}}</option>
                             </select>
                           </div>
                         </div>
                       </div>
                     </div>
                   </form>
                 </div>
                 <div class="col-lg-4">
                   <h3>
                     Attachments
                     <span class="glyphicon glyphicon-chevron-left" [ngClass]="{disabled: file_index <= 0}" (click)="onImgClick(-1)"></span>
                     <span class="glyphicon glyphicon-chevron-right" [ngClass]="{disabled: file_index >= maxIndex}" (click)="onImgClick(+1)"></span>
                     <span class="glyphicon glyphicon-trash" [ngClass]="{disabled: file_index == -1}" (click)="onImgDelete()"></span>
                     <span class="glyphicon glyphicon-plus-sign" [ngClass]="{disabled: asset.file == undefined}" (click)="onImgNew()"></span>
                   </h3>
                   <div class="carousel">
                     <img *ngFor="let src of asset.file; let i = index" [hidden]="file_index != i" (click)="onImgClick()" src="/file/{{asset.id}}/{{src}}" />
                   </div>
                 </div>
               </div>
             </div>`,
  styles: ['.container-fluid { border: 1px solid lightgreen; background: #f0fff0 }',
           '.my-input-group { padding: 0 5px 10px 0 }',
           '.my-input-group:last-child { padding-right: 0 }',
           'textarea { resize: none }',
           '.glyphicon:not(.disabled) { cursor: pointer }',
           '.disabled { color: lightgrey }']
})
export class AssetComponent {
  private original: any;
  private asset: any = {};
  private file_index: number = -1;

  @ViewChild('form') form;
  @Output('event') event = new EventEmitter<any>();

  @Input('asset') set _asset(asset: any) {
    this.original = asset;
    this.asset = Object.assign({}, this.original);
    this.file_index = this.asset.file && this.asset.file.length > 0 ? 0 : -1;
  }

  constructor(private fieldMap: FieldMap, private enumService: EnumService) {}

  options(field: string) {
    return this.enumService.get(field).options();
  }

  onImgClick(delta: number) {
    if (this.maxIndex == -1) return;
    this.file_index += delta;
    this.file_index = Math.max(0, this.file_index);
    this.file_index = Math.min(this.maxIndex, this.file_index);
  }

  get maxIndex(): number {
    if (this.file_index == -1 || ! this.asset.file) return -1;
    return this.asset.file.length - 1;
  }

  onReset() {
    this._asset = this.original;
    this.pristine(this.form);
  }

  onSave() {
    this.event.emit({save: this.asset});
    Object.assign(this.original, this.asset);
    this.pristine(this.form);
  }

  onDelete() {
    this.event.emit({delete: this.asset.id});
    this._asset = undefined;
  }

  onAdd() {
    this.event.emit({add: this.asset});
  }

  pristine(form: any, value?: boolean): void {
    if (value == undefined) value = true; // default argument value not working, weirdly
    if (! form) return;
    form['_touched'] = ! value;
    form['_pristine'] = value;
    form.form['_touched'] = ! value;
    form.form['_pristine'] = value;
    for (let k in form.form.controls) {
      form.form.controls[k]['_touched'] = ! value;
      form.form.controls[k]['_pristine'] = value;
    }
  }
}
