import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { FieldMap } from './field-map';
import { Frequency } from './frequency';
import { LAST_OPTION } from './enum';

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
                     <h3 class="col-lg-12">
                       Asset
                       <span class="glyphicon glyphicon-arrow-left" (click)="onReset()" [ngClass]="{disabled: form.pristine}"></span>
                       <span class="glyphicon glyphicon-floppy-disk" (click)="onSave()" [ngClass]="{disabled: form.pristine || original == undefined}"></span>
                       <span class="glyphicon glyphicon-trash" (click)="onDelete()" [ngClass]="{disabled: original == undefined}"></span>
                       <span class="glyphicon glyphicon-plus-sign" (click)="onAdd()"></span>
                     </h3>
                   </div>
                   <form role="form" #form="ngForm" class="row">
                     <div *ngFor="let col of fieldMap.assetInputs" class="col-lg-6">
                       <div *ngFor="let group of col" class="form-group">
                         <div *ngFor="let input of group" [ngClass]="{'col-lg-6': group.length > 1, 'my-input-group': group.length > 1}">
                           <div *ngIf="input.type != 'area' && input.type != 'enum' && input.type != 'freq'">
                             <label for="input.field">{{input.label}}</label>
                             <input [type]="input.type" class="form-control" required [(ngModel)]="asset[input.field]" [name]="input.field" />
                           </div>
                           <div *ngIf="input.type == 'freq'">
                             <label for="input.field">{{input.label}}</label>
                             <div class="col-lg-7 my-input-group">
                               <input class="form-control" [type]="input.type" required [(ngModel)]="freqs[input.field].value" [name]="input.field" />
                             </div>
                             <div class="col-lg-5 my-input-group">
                               <select class="form-control" required [name]="input.field + '-units'" [(ngModel)]="freqs[input.field].units">
                                 <option *ngFor="let o of unitOptions()" [value]="o.value">{{o.label}}</option>
                               </select>
                             </div>
                           </div>
                           <div *ngIf="input.type == 'area'">
                             <label for="input.field">{{input.label}}</label>
                             <textarea class="form-control" required [(ngModel)]="asset[input.field]" [name]="input.field" rows="5"></textarea>
                           </div>
                           <div *ngIf="input.type == 'enum'">
                             <label for="input.field">{{input.label}}</label>
                             <select *ngIf="addNew.field != input.field" class="form-control" [(ngModel)]="asset[input.field]" [name]="input.field" (ngModelChange)="onEnumChange(input)">
                               <option *ngFor="let o of options(input.field)" [value]="o.value">{{o.label}}</option>
                             </select>
                             <input #addNew type="text" *ngIf="addNew.field == input.field" class="form-control" [(ngModel)]="addNew.label" [name]="input.field" (blur)="onAddNew(input, addNew.label)" (change)="onAddNew(input, addNew.label)"/>
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
                     <span class="glyphicon glyphicon-chevron-right" [ngClass]="{disabled: file_index >= files.length - 1}" (click)="onImgClick(+1)"></span>
                     <span class="glyphicon glyphicon-trash" [ngClass]="{disabled: file_index == -1}" (click)="onImgDelete()"></span>
                     <span class="glyphicon glyphicon-plus-sign" [ngClass]="{disabled: ! original || original.id == undefined}" (click)="onImgNew()"></span>
                   </h3>
                   <input #upload *ngIf="showUpload" type="file" (change)="onUpload()"/>
                   <div *ngIf="! showUpload">
                     <div class="attachment" *ngFor="let file of files; let i = index" [hidden]="file_index != i">
                       <img *ngIf="isImage(file.name)" src="/file/{{asset.id}}/{{file.attachment_id}}"/>
                       <a *ngIf="! isImage(file.name)" target="attachment" href="/file/{{asset.id}}/{{file.attachment_id}}/{{file.name}}">{{file.name}}</a>
                     </div>
                   </div>
                 </div>
               </div>
             </div>`,
  styles: ['.container-fluid { background: #f0fff0 }',
           '.my-input-group { padding: 0 5px 10px 0 }',
           '.my-input-group:last-child { padding-right: 0 }',
           'textarea { resize: none }',
           '.glyphicon:not(.disabled) { cursor: pointer }',
           '.disabled { color: lightgrey }',
           '.attachment img { max-width: 100%; max-height: 100% }']
})
export class AssetComponent {
  private original: any;
  private asset: any = {};
  private freqs: any = {};
  private files: any[] = [];
  private file_index: number = -1;
  private showUpload: boolean = false;
  private addNew: any = {};

  @ViewChild('form') form: HTMLFormElement;
  @ViewChild('upload') upload: ElementRef;
  @ViewChildren('addNew') addNewInput: QueryList<ElementRef>;

  @Output('event') event = new EventEmitter<any>();

  @Input('asset') set _asset(asset: any) {
    this.original = asset;
    this.asset = Object.assign({}, this.original);
    this.file_index = -1;
    this.files = [];
    this.pristine(this.form);
    if (this.asset.id) {
      this.dataService.getAttachments(this.asset)
                      .subscribe(files => {
                        this.files = files;
                        this.file_index = this.files.length > 0 ? 0 : -1;
                      });
    }
    // pull out frequencies
    for (let input of this.fieldMap.allInputs) {
      if (input.type == 'freq') {
        this.freqs[input.field] = new Frequency(this.asset, input.field);
      }
    }
  }

  constructor(private fieldMap: FieldMap, private enumService: EnumService, private dataService: DataService) {}

  unitOptions() {
    return Frequency.unitOptions();
  }

  options(field: string) {
    return this.enumService.get(field).options();
  }

  onImgClick(delta: number) {
    if (this.files.length == 0) return;
    this.file_index += delta;
    this.file_index = Math.max(0, this.file_index);
    this.file_index = Math.min(this.files.length - 1, this.file_index);
  }

  onImgDelete() {
    this.dataService.deleteAttachment(this.asset, this.files[this.file_index].attachment_id)
                    .subscribe(files => {
                      this.files = files;
                      if (this.file_index == this.files.length) --this.file_index;
                      if (this.files.length == 0) this.file_index = -1;
                    });
  }

  onImgNew() {
    this.showUpload = true;
  }

  onUpload() {
    this.showUpload = false;
    let inputEl = this.upload.nativeElement;
    if (inputEl.files.length > 0) {
      let name = inputEl.value;
      let i = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1;
      if (i >= name.length) return;
      name = name.substring(i);
      this.dataService.uploadAttachment(this.asset, name, inputEl.files[0])
                      .subscribe(files => {
                        this.files = files;
                        this.file_index = this.files.length - 1;
                      });
    }
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
    this.event.emit({delete: this.original.id});
    this._asset = undefined;
  }

  onAdd() {
    this.event.emit({add: this.asset});
  }

  onEnumChange(input) {
    if (this.asset[input.field] == LAST_OPTION.value) {
      this.addNew.field = input.field;
      this.addNew.label = undefined;
      setTimeout(() => this.addNewInput.first.nativeElement.focus());
    }
  }

  onAddNew(input, label) {
    if (label) {
      this.enumService.addNewLabel(input.field, label)
                      .subscribe(enumValue => {
                        this.asset[input.field] = enumValue.value;
                        delete this.addNew.field;
                      });
    } else {
      this.asset[input.field] = undefined;
      delete this.addNew.field;
    }
  }

  isImage(src): boolean {
    src = src.toLowerCase();
    for (let ext of ['.jpg', '.jpeg', '.gif', '.png', '.bmp']) {
      if (src.endsWith(ext)) return true;
    }
    return false;
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
