import { Component, Input, Output, ViewChild, EventEmitter } from '@angular/core';
import { EnumService } from './enum.service';
import { ASSET_FIELDS } from './field-map';

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
  template: `<form role="form" #form="ngForm" class="container-fluid">
               <div class="row">
                 <div *ngFor="let col of inputs" class="col-lg-4">
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
                 <div class="col-lg-4">
                   <img *ngFor="let src of asset.file; let i = index" [hidden]="file_index != i" (click)="onImgClick()" src="/file/{{asset.id}}/{{src}}" />
                   <p>
                   <button class="btn" (click)="onReset()" [disabled]="form.pristine">Reset</button>
                   <button class="btn" (click)="onSave()" [disabled]="form.pristine || original == undefined">Save</button>
                   <button class="btn" (click)="onDelete()" [disabled]="original == undefined">Delete</button>
                   <button class="btn" (click)="onAdd()">Add New</button>
                 </div>
               </div>
             </form>`,
  styles: ['.my-input-group { padding: 0 5px 10px 0 }',
           '.my-input-group:last-child { padding-right: 0 }',
           'textarea { resize: none }'
          ]
})
export class AssetComponent {
  private inputs: any[] = ASSET_FIELDS;
  private original: any;
  private asset: any = {};
  private file_index: number = 0;

  @ViewChild('form') form;
  @Output('event') event = new EventEmitter<any>();

  @Input('asset') set _asset(asset: any) {
    this.original = asset; // could be undefined if we are asked to clear the asset display fields
    this.asset = Object.assign({}, this.original);
  }

  constructor(private enumService: EnumService) {}

  options(field: string) {
    return this.enumService.get(field).options();
  }

  onImgClick() {
    if (++this.file_index == this.asset.file.length) this.file_index = 0;
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
