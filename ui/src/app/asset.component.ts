import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { BookingComponent } from './booking.component';
import { AttachmentComponent } from './attachment.component';
import { FieldMap } from './field-map';
import { Frequency } from './frequency';
import { User, BOOK_ROLE, VIEW_ROLE, ADMIN_ROLE } from './user';
import { pristine } from './pristine';
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
  selector: 'badass-asset',
  template: `<div class="container-fluid">
               <div class="row">
                 <div class="col-lg-8">
                   <div class="row">
                     <h3 class="col-lg-12">
                       Asset
                       <span class="glyphicon glyphicon-arrow-left" (click)="onReset()" [ngClass]="{disabled: form.pristine}"></span>
                       <span class="glyphicon glyphicon-floppy-disk" (click)="onSave()" [ngClass]="{disabled: ! hasRole() || form.pristine || original == undefined}"></span>
                       <span class="glyphicon glyphicon-trash" (click)="onDelete()" [ngClass]="{disabled: ! hasRole(true) || original == undefined}"></span>
                       <span class="glyphicon glyphicon-plus-sign" (click)="onAdd()" [ngClass]="{disabled: ! hasRole(true)}"></span>
                       <span class="glyphicon glyphicon-book" [ngClass]="{disabled: bookDisabled()}" data-toggle="modal" data-target="#bookingModal"></span>
                       <span class="glyphicon glyphicon-export bookOut" (click)="status.book(true)" [ngClass]="{disabled: status.out || ! status.overdue}"></span>
                       <span class="glyphicon glyphicon-import bookIn" (click)="status.book(false)" [ngClass]="{disabled: ! status.out, overdue: status.out && status.overdue}"></span>
                     </h3>
                   </div>
                   <form role="form" #form="ngForm" class="row">
                     <div *ngFor="let col of fieldMap.assetInputs" class="col-lg-6">
                       <div *ngFor="let group of col" class="form-group">
                         <div *ngFor="let input of group" [ngClass]="{'col-lg-6': group.length > 1, 'my-input-group': group.length > 1}">
                           <div *ngIf="input.type != 'area' && input.type != 'enum' && input.type != 'freq'">
                             <label htmlFor="{{input.field}}">{{input.label}}</label>
                             <input [type]="input.type" class="form-control" required [(ngModel)]="asset[input.field]" [name]="input.field" />
                           </div>
                           <div *ngIf="input.type == 'freq'">
                             <label htmlFor="{{input.field}}">{{input.label}}</label>
                             <div>
                               <div class="col-lg-7 my-input-group">
                                 <input class="form-control" [type]="input.type" required [(ngModel)]="freqs[input.field].value" [name]="input.field" />
                               </div>
                               <div class="col-lg-5 my-input-group">
                                 <select class="form-control" required [name]="input.field + '-units'" [(ngModel)]="freqs[input.field].units">
                                   <option *ngFor="let o of unitOptions()" [value]="o.value">{{o.label}}</option>
                                 </select>
                               </div>
                             </div>
                           </div>
                           <div *ngIf="input.type == 'area'">
                             <label htmlFor="{{input.field}}">{{input.label}}</label>
                             <textarea class="form-control" required [(ngModel)]="asset[input.field]" [name]="input.field" rows="7"></textarea>
                           </div>
                           <div *ngIf="input.type == 'enum'">
                             <label htmlFor="{{input.field}}">{{input.label}}</label>
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
                   <badass-attachment [user]="user" [asset]="asset"></badass-attachment>
                   <badass-booking *ngIf="showBookings()" [user]="user" [asset]="asset" (status)="setStatus($event)"></badass-booking>
                 </div>
               </div>
             </div>`,
  styles: ['.container-fluid { background: #f0fff0 }',
           '.my-input-group { padding: 0 5px 10px 0 }',
           '.my-input-group:last-child { padding-right: 0 }',
           'textarea { resize: none }',
           '.glyphicon:not(.disabled) { cursor: pointer }',
           '.bookOut { margin-left: 20px }',
           '.overdue { color: red }',
           '.disabled { color: lightgrey }',
           'badass-booking { display: block; height: 177px; overflow: auto }']
})
export class AssetComponent {
  private original: any;
  private asset: any = {};
  private freqs: any = {};
  private addNew: any = {};

  private status: any = {};

  @ViewChild('form') form: HTMLFormElement;
  @ViewChildren('addNew') addNewInput: QueryList<ElementRef>;

  @Input('user') user: User;
  @Output('event') event = new EventEmitter<any>();

  @Input('asset') set _asset(asset: any) {
    this.original = asset;
    this.asset = Object.assign({}, this.original);
    this.status = {};
    pristine(this.form);
    // pull out frequencies
    for (let input of this.fieldMap.allInputs) {
      if (input.type == 'freq') {
        this.freqs[input.field] = new Frequency(this.asset, input.field);
      }
    }
  }

  @Input('search') search;

  constructor(private fieldMap: FieldMap, private enumService: EnumService, private dataService: DataService) {}

  setStatus(status: any) {
    this.status = status;
  }

  showBookings() {
    return this.user != undefined && this.user.role >= VIEW_ROLE;
  }

  unitOptions() {
    return Frequency.unitOptions();
  }

  options(field: string) {
    return this.enumService.get(field).options(true, this.user != undefined && this.user.role >= ADMIN_ROLE);
  }

  hasRole(admin: boolean=false) {
    let role = admin ? ADMIN_ROLE : VIEW_ROLE;
    return this.user != undefined && this.user.role >= role;
  }

  bookDisabled() {
    let hasRole: boolean = this.user != undefined && this.user.role >= BOOK_ROLE;
    return this.original == undefined || ! hasRole;
  }

  onReset() {
    this._asset = this.original;
    pristine(this.form);
  }

  onSave() {
    this.event.emit({save: this.asset});
  }

  onDelete() {
    this.event.emit({delete: this.original.id});
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
                        this.search.reload_enums = true;
                      });
    } else {
      this.asset[input.field] = undefined;
      delete this.addNew.field;
    }
  }
}
