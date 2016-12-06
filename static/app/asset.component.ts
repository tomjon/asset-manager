import { Component, Input } from '@angular/core';
import { DataService } from './data.service';

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
                     <input type="text" class="form-control" required [(ngModel)]="asset.manufacturer" name="manufacturer" />
                   </div>
                   <div class="col-lg-6 my-input-group">
                     <label for="model">Model</label>
                     <input type="text" class="form-control" required [(ngModel)]="asset.model" name="model" />
                   </div>
                 </div>
                 <img *ngFor="let src of asset.file" src="/file/{{asset.id}}/{{src}}" />
                 <button (click)="onReset()">Reset</button>
                 <button (click)="onSave()">Save</button>
                 <button (click)="onDelete()">Delete</button>
                 <button (click)="onAdd()">Add New</button>
               </div>
             </form>`,
  styles: ['.my-input-group { padding: 0 5px 5px 0 }',
           '.my-input-group:last-child { padding-right: 0 }',
           'textarea { resize: none }']
})
export class AssetComponent {
  private original: any;
  private asset: any = {};

  @Input('asset') set _asset(asset: any) {
    this.original = asset; // could be undefined if we are asked to clear the asset display fields
    this.asset = Object.assign({}, this.original);
    for (let key of ['acquired', 'calibration_date', 'calibration_due']) {
      if (this.asset[key]) {
        this.asset[key] = this.asset[key].slice(0, 10);
      }
    }
  }

  onReset() {
    this._asset = this.original;
  }

  onSave() {
    Object.assign(this.original, this.asset);
  }

  onDelete() {
    this._asset = undefined;
  }

  onAdd() {

  }
}