import { Component, Input } from '@angular/core';
import { DataService } from './data.service';

/**
 * The component makes a copy of the input item. If 'reset' is pressed, the copy
 * is re-made from the original. If 'save' is pressed, the original is changed
 * to match the copy (thus affecting whereever else the original might be
 * displayed in the UI).
 */
@Component({
  selector: 'bams-item',
  template: `<form role="form" #form="ngForm">
               <div class="col-lg-4">
                 <div class="form-group">
                   <label for="item">Item</label>
                   <input type="text" class="form-control" required [(ngModel)]="item.item" name="item" />
                 </div>
                 <div class="form-group">
                   <label for="category">Category</label>
                   <input type="text" class="form-control" required [(ngModel)]="item.category" name="category" />
                 </div>
                 <div class="form-group">
                   <label for="description">Description</label>
                   <textarea class="form-control" required [(ngModel)]="item.description" name="description" rows="5"></textarea>
                 </div>
                 <div class="form-group">
                   <div class="col-lg-6 my-input-group">
                     <label for="start_freq">Start Freq (MHz)</label>
                     <input type="text" class="form-control" required [(ngModel)]="item.start_freq" name="start_freq" />
                   </div>
                   <div class="col-lg-6 my-input-group">
                     <label for="stop_freq">Stop Freq (MHz)</label>
                     <input type="text" class="form-control" required [(ngModel)]="item.stop_freq" name="stop_freq" />
                   </div>
                 </div>
                 <div class="form-group">
                   <label for="condition">Condition</label>
                   <input type="text" class="form-control" required [(ngModel)]="item.condition" name="condition" />
                 </div>
               </div>
               <div class="col-lg-4">
                 <div class="form-group">
                   <label for="id_number">ID Number</label>
                   <input type="text" class="form-control" required [(ngModel)]="item.id_number" name="id_number" />
                 </div>
                 <div class="form-group">
                   <label for="calibration_date">Last Calibration</label>
                   <input type="date" class="form-control" required [(ngModel)]="item.calibration_date" name="calibration_date" />
                 </div>
                 <div class="form-group">
                   <label for="calibration_due">Calibration Date</label>
                   <input type="date" class="form-control" required [(ngModel)]="item.calibration_due" name="calibration_due" />
                 </div>
                 <div class="form-group">
                   <label for="calibration_type">Calibration Type</label>
                   <input type="text" class="form-control" required [(ngModel)]="item.calibration_type" name="calibration_type" />
                 </div>
                 <div class="form-group">
                   <label for="location">Location</label>
                   <input type="text" class="form-control" required [(ngModel)]="item.location" name="location" />
                 </div>
                 <div class="form-group">
                   <div class="col-lg-6 my-input-group">
                     <label for="rack">Rack</label>
                     <input type="text" class="form-control" required [(ngModel)]="item.rack" name="rack" />
                   </div>
                   <div class="col-lg-6 my-input-group">
                     <label for="shelf">Shelf</label>
                     <input type="text" class="form-control" required [(ngModel)]="item.shelf" name="shelf" />
                   </div>
                 </div>
               </div>
               <div class="col-lg-4">
                 <div class="form-group">
                   <div class="col-lg-6 my-input-group">
                     <label for="manufacturer">Manufacturer</label>
                     <input type="text" class="form-control" required [(ngModel)]="item.manufacturer" name="manufacturer" />
                   </div>
                   <div class="col-lg-6 my-input-group">
                     <label for="model">Model</label>
                     <input type="text" class="form-control" required [(ngModel)]="item.model" name="model" />
                   </div>
                 </div>
                 <img *ngFor="let src of item.file" src="/file/{{item.id}}/{{src}}" />
                 <button (click)="onReset()">Reset</button>
                 <button (click)="onSave()">Save</button>
               </div>
             </form>`,
  styles: ['.my-input-group { padding: 0 5px 5px 0 }',
           '.my-input-group:last-child { padding-right: 0 }',
           'textarea { resize: none }']
})
export class ItemComponent {
  private original: any;
  private item: any = {};

  @Input('item') set _item(item: any) {
    this.original = item; // could be undefined if we are asked to clear the item display fields
    this.item = Object.assign({}, this.original);
    for (let key of ['acquired', 'calibration_date', 'calibration_due']) {
      if (this.item[key]) {
        this.item[key] = this.item[key].slice(0, 10);
      }
    }
  }

  onReset() {
    this._item = this.original;
  }

  onSave() {
    Object.assign(this.original, this.item);
  }
}
