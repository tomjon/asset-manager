import { Component, Input, Output, ViewChild, EventEmitter } from '@angular/core';
import { EnumService } from './enum.service';

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
  template: `<form role="form" #form="ngForm">
               <div class="col-lg-4">
                 <div class="form-group">
                   <label for="item">Item</label>
                   <input type="text" class="form-control" required [(ngModel)]="asset.item" name="item" />
                 </div>
                 <div class="form-group">
                   <label for="category">Category</label>
                   <input type="text" class="form-control" required [(ngModel)]="asset.category" name="category" />
                 </div>
                 <div class="form-group">
                   <label for="description">Description</label>
                   <textarea class="form-control" required [(ngModel)]="asset.description" name="description" rows="5"></textarea>
                 </div>
                 <div class="form-group">
                   <div class="col-lg-6 my-input-group">
                     <label for="start_freq">Start Freq (MHz)</label>
                     <input type="text" class="form-control" required [(ngModel)]="asset.start_freq" name="start_freq" />
                   </div>
                   <div class="col-lg-6 my-input-group">
                     <label for="stop_freq">Stop Freq (MHz)</label>
                     <input type="text" class="form-control" required [(ngModel)]="asset.stop_freq" name="stop_freq" />
                   </div>
                 </div>
                 <div class="form-group">
                   <label for="condition">Condition</label>
                   <input type="text" class="form-control" required [(ngModel)]="asset.condition" name="condition" />
                 </div>
               </div>
               <div class="col-lg-4">
                 <div class="form-group">
                   <label for="id_number">ID Number</label>
                   <input type="text" class="form-control" required [(ngModel)]="asset.id_number" name="id_number" />
                 </div>
                 <div class="form-group">
                   <label for="calibration_date">Last Calibration</label>
                   <input type="date" class="form-control" required [(ngModel)]="asset.calibration_date" name="calibration_date" />
                 </div>
                 <div class="form-group">
                   <label for="calibration_due">Calibration Date</label>
                   <input type="date" class="form-control" required [(ngModel)]="asset.calibration_due" name="calibration_due" />
                 </div>
                 <div class="form-group">
                   <label for="calibration_type">Calibration Type</label>
                   <input type="text" class="form-control" required [(ngModel)]="asset.calibration_type" name="calibration_type" />
                 </div>
                 <div class="form-group">
                   <label for="location">Location</label>
                   <input type="text" class="form-control" required [(ngModel)]="asset.location" name="location" />
                 </div>
                 <div class="form-group">
                   <div class="col-lg-6 my-input-group">
                     <label for="rack">Rack</label>
                     <input type="text" class="form-control" required [(ngModel)]="asset.rack" name="rack" />
                   </div>
                   <div class="col-lg-6 my-input-group">
                     <label for="shelf">Shelf</label>
                     <input type="text" class="form-control" required [(ngModel)]="asset.shelf" name="shelf" />
                   </div>
                 </div>
               </div>
               <div class="col-lg-4">
                 <div class="form-group">
                   <div class="col-lg-6 my-input-group">
                     <label for="manufacturer">Manufacturer</label>
                     <select class="form-control" [(ngModel)]="asset.manufacturer" name="manufacturer">
                       <option *ngFor="let o of options('manufacturer')" [value]="o.value">{{o.label}}</option>
                     </select>
                   </div>
                   <div class="col-lg-6 my-input-group">
                     <label for="model">Model</label>
                     <input type="text" class="form-control" required [(ngModel)]="asset.model" name="model" />
                   </div>
                 </div>
                 <p>
                 <img *ngFor="let src of asset.file; let i = index" [hidden]="file_index != i" (click)="onImgClick()" src="/file/{{asset.id}}/{{src}}" />
                 <p>
                 <button class="btn" (click)="onReset()" [disabled]="form.pristine">Reset</button>
                 <button class="btn" (click)="onSave()" [disabled]="form.pristine || original == undefined">Save</button>
                 <button class="btn" (click)="onDelete()" [disabled]="original == undefined">Delete</button>
                 <button class="btn" (click)="onAdd()">Add New</button>
               </div>
             </form>`,
  styles: ['.my-input-group { padding: 0 5px 5px 0 }',
           '.my-input-group:last-child { padding-right: 0 }',
           'textarea { resize: none }']
})
export class AssetComponent {
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
    let options = [];
    for (let e of this.enumService.get(field).values) {
      options[e.order] = {value: e.value, label: e.label};
    }
    return options;
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
