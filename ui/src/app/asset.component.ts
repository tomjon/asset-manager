import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { BookingComponent } from './booking.component';
import { AttachmentComponent } from './attachment.component';
import { FieldMap } from './field-map';
import { Frequency } from './frequency';
import { Booking, Bookings } from './booking';
import { User, BOOK_ROLE, VIEW_ROLE, ADMIN_ROLE } from './user';
import { pristine } from './pristine';
import { Enum, FIRST_OPTION, LAST_OPTION } from './enum';
import { DateRange } from './date-range';

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
                       <a *ngIf="original != undefined && original.url != undefined" href="{{original.url}}" target="asset">Asset</a>
                       <span *ngIf="asset.url == undefined">Asset</span>
                       <span class="glyphicon glyphicon-arrow-left" (click)="onReset()" [ngClass]="{disabled: ! canReset}"></span>
                       <span class="glyphicon glyphicon-floppy-disk" (click)="onSave()" [ngClass]="{disabled: ! canSave}"></span>
                       <span class="glyphicon glyphicon-trash" [attr.data-toggle]="canDelete ? 'modal' : null" [attr.data-target]="canDelete ? '#confirmModal' : null" (click)="openDelete()" [ngClass]="{disabled: ! canDelete}"></span>
                       <span class="glyphicon glyphicon-plus-sign" (click)="openAdd()" [attr.data-toggle]="canAdd ? 'modal' : null" [attr.data-target]="canAdd ? '#confirmModal' : null" (click)="openAdd()" [ngClass]="{disabled: ! canAdd}"></span>
                       <span class="glyphicon glyphicon-book" [ngClass]="{disabled: ! canBook}" (click)="onBook()" [attr.data-toggle]="canBook ? 'modal' : null" [attr.data-target]="canBook ? '#bookingModal' : null"></span>
                     </h3>
                   </div>
                   <form role="form" #form="ngForm" class="row">
                     <div *ngFor="let col of fieldMap.assetInputs" class="col-lg-6">
                       <div *ngFor="let group of col" class="form-group">
                         <div *ngFor="let input of group" [ngClass]="{'col-lg-6': group.length > 1, 'my-input-group': group.length > 1}">
                           <div *ngIf="input.type != 'area' && input.type != 'enum' && input.type != 'freq'">
                             <label htmlFor="{{input.field}}">{{input.label}}</label>
                             <input [type]="input.type" class="form-control" [(ngModel)]="asset[input.field]" [name]="input.field" />
                           </div>
                           <div *ngIf="input.type == 'freq'">
                             <label htmlFor="{{input.field}}">{{input.label}}</label>
                             <div>
                               <div class="col-lg-7 my-input-group">
                                 <input class="form-control" [type]="input.type" [(ngModel)]="freqs[input.field].value" [name]="input.field" />
                               </div>
                               <div class="col-lg-5 my-input-group">
                                 <select class="form-control" [name]="input.field + '-units'" [(ngModel)]="freqs[input.field].units">
                                   <option *ngFor="let o of unitOptions()" [value]="o.value">{{o.label}}</option>
                                 </select>
                               </div>
                             </div>
                           </div>
                           <div *ngIf="input.type == 'area'">
                             <label htmlFor="{{input.field}}">{{input.label}}</label>
                             <textarea class="form-control" [(ngModel)]="asset[input.field]" [name]="input.field" rows="7"></textarea>
                           </div>
                           <div *ngIf="input.type == 'enum'">
                             <label htmlFor="{{input.field}}">{{input.label}}</label>
                             <select *ngIf="addNew.field != input.field" class="form-control" [(ngModel)]="asset[input.field]" [name]="input.field" (ngModelChange)="onEnumChange(input)">
                               <option *ngFor="let o of options(input.field)" [value]="o.value">{{o.label}}</option>
                             </select>
                             <input #addNew type="text" *ngIf="addNew.field == input.field" class="form-control" [(ngModel)]="addNew.label" [name]="input.field" (change)="onAddNew(input, addNew.label)"/>
                           </div>
                         </div>
                       </div>
                     </div>
                   </form>
                 </div>
                 <div class="col-lg-4">
                   <div class="btn-group btn-group-sm selector" role="group">
                     <button *ngFor="let name of tabs; let i = index" type="button" class="btn" [ngClass]="tab == i ? 'btn-primary' : 'btn-default'" [disabled]="i > 0 && bookings == undefined" (click)="onTabClick(i)">{{name}}</button>
                   </div>
                   <badass-attachment *ngIf="tab == 0" [user]="user" [asset]="asset"></badass-attachment>
                   <div *ngIf="tab == 1">
                     <h3>{{tabs[1]}}</h3>
                     <badass-booking-table class="tab-content" [user]="user" [range]="range" [bookings]="bookings" (event)="onBookingEvent($event)"></badass-booking-table>
                   </div>
                   <div *ngIf="tab == 2">
                     <h3>{{tabs[2]}}</h3>
                     <badass-calendar class="tab-content" [user]="user" [booking]="booking" [bookings]="bookings" (event)="onEvent($event)"></badass-calendar>
                   </div>
                 </div>
               </div>
             </div>
             <div id="confirmModal" class="modal fade" role="dialog">
               <div class="modal-dialog">
                 <div class="modal-content">
                   <div class="modal-header">
                     <button type="button" class="close" data-dismiss="modal">&times;</button>
                     <h4 class="modal-title">{{confirm.title}}</h4>
                   </div>
                   <div class="modal-body">
                     {{confirm.body}}
                   </div>
                   <div class="modal-footer">
                     <button type="button" class="btn btn-default" data-dismiss="modal" (click)="confirm.onClick()">{{confirm.button}}</button>
                     <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                   </div>
                 </div>
               </div>
             </div>`,
  styles: ['.container-fluid { background: #f0fff0 }',
           '.my-input-group { padding: 0 5px 10px 0 }',
           '.my-input-group:last-child { padding-right: 0 }',
           'textarea { resize: none }',
           '.checkOut { margin-left: 20px }',
           '.overdue { color: red }',
           'badass-booking-table { display: block; overflow: auto }',
           '.selector { float: right; margin-top: 10px }',
           '.tab-content { display: block; margin-top: 20px }',
           '.item { cursor: pointer }',
           '.item.active { color: blue; cursor: default }',
           '.item.disabled { color: lightgrey; cursor: default }']
})
export class AssetComponent {
  private tabs: string[] = ['Attachments', 'Bookings List', 'Bookings Calendar'];

  private original: any;
  private asset: any = {};
  private freqs: any = {};
  private addNew: any = {};
  private url: any = {};
  private confirm: any = {};
  private tab: number = 0;

  @ViewChild('form') form: HTMLFormElement;
  @ViewChildren('addNew') addNewInput: QueryList<ElementRef>;

  @Input('user') user: User;
  @Output('event') event = new EventEmitter<any>();

  @Input('range') range: DateRange;

  @Input('asset') set _asset(asset: any) {
    this.original = asset;
    this.asset = Object.assign({}, this.original);
    pristine(this.form);
    // pull out frequencies
    for (let input of this.fieldMap.allInputs) {
      if (input.type == 'freq') {
        this.freqs[input.field] = new Frequency(this.asset, input.field);
      }
    }
  }

  @Input() booking: Booking; // the 'global' booking details

  bookings: Bookings;
  @Input('bookings') set _bookings(bookings: Bookings) {
    this.bookings = bookings;
    if (bookings == undefined) {
      this.tab = 0;
    }
  }

  @Input('search') search;

  constructor(private fieldMap: FieldMap, private enumService: EnumService, private dataService: DataService) {}

  onTabClick(tab: number) {
    if (tab == 0 || this.bookings != undefined) { //FIXME duplicated 'disabled' logic
      this.tab = tab;
    }
  }

  onEvent(event) {
    this.event.emit(event);
  }

  unitOptions() {
    return Frequency.unitOptions();
  }

  //FIXME this is called many, many times per field....
  options(field: string) {
    let e: Enum = this.enumService.get(field);
    if (this.asset[field] != undefined && ! e.hasValue(this.asset[field])) {
      let value = this.original ? this.original[field] : undefined;
      if (! e.hasValue(value)) {
        value = undefined; // if even the original doesn't have the value, go back to undefined
      }
      setTimeout(() => this.asset[field] = value);
    }
    return e.options(true, this.user != undefined && this.user.role >= ADMIN_ROLE);
  }

  hasRole(admin: boolean=false) {
    let role = admin ? ADMIN_ROLE : VIEW_ROLE;
    return this.user != undefined && this.user.role >= role;
  }

  get canReset() {
    let form: any = this.form;
    return ! form.pristine;
  }

  onReset() {
    if (! this.canReset) return;
    this._asset = this.original;
    pristine(this.form);
  }

  get canSave() {
    let form: any = this.form;
    return this.hasRole(true) && ! form.pristine && this.original != undefined;
  }

  onSave() {
    if (! this.canSave) return;
    this.event.emit({save: this.asset});
  }

  get canDelete(): boolean {
    return this.hasRole(true) && this.original != undefined;
  }

  openDelete() {
    if (! this.canDelete) return;
    this.confirm.title = "Confirm delete";
    let manufacturer = this.asset.manufacturer != undefined ? this.enumService.get('manufacturer').label(this.asset.manufacturer) : '';
    this.confirm.body = `Do you really want to delete the asset ${manufacturer} ${this.asset.model} ${this.asset.serial}?`;
    this.confirm.button = 'Delete';
    this.confirm.onClick = () => {
      this.event.emit({delete: this.original.id});
    }
  }

  get canAdd() {
    return this.hasRole(true);
  }

  openAdd() {
    if (! this.canAdd) return;
    this.confirm.title = "Confirm add new asset";
    if (this.asset.model == undefined && this.asset.serial == undefined) {
      this.confirm.body = 'Do you really want create a new blank asset?';
    } else {
      let manufacturer = this.asset.manufacturer != undefined ? this.enumService.get('manufacturer').label(this.asset.manufacturer) : '';
      this.confirm.body = `Do you really want create a new asset ${manufacturer} ${this.asset.model} ${this.asset.serial}?`;
    }
    this.confirm.button = 'Add New Asset';
    this.confirm.onClick = () => {
      this.event.emit({add: this.asset});
      pristine(this.form, false);
    }
  }

  get canBook() {
    let hasRole: boolean = this.user != undefined && this.user.role >= BOOK_ROLE;
    return this.original != undefined && hasRole;
  }

  onBook() {
    if (! this.canBook) return;
    this.event.emit({book: this.asset});
  }

  // booking table events are cascaded up to the app component
  onBookingEvent(event) {
    this.event.emit(event);
  }

  onEnumChange(input) {
    if (this.asset[input.field] == String(FIRST_OPTION.value)) {
      // need this because although on 'input' the select converts values to strings,
      // it doesn't convert back for the model value
      this.asset[input.field] = FIRST_OPTION.value;
    } else if (this.asset[input.field] == LAST_OPTION.value) {
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
