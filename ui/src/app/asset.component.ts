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
import { Enum, LAST_OPTION } from './enum';

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
                       <span class="glyphicon glyphicon-trash"  [attr.data-toggle]="canDelete ? 'modal' : null" [attr.data-target]="canDelete ? '#confirmModal' : null" [ngClass]="{disabled: ! canDelete}"></span>
                       <span class="glyphicon glyphicon-plus-sign" (click)="onAdd()" [ngClass]="{disabled: ! canAdd}"></span>
                       <span class="glyphicon glyphicon-book" [ngClass]="{disabled: ! canBook}" (click)="onBook()" [attr.data-toggle]="canBook ? 'modal' : null" [attr.data-target]="canBook ? '#bookingModal' : null"></span>
                     </h3>
                   </div>
                   <form role="form" #form="ngForm" class="row">
                     <div *ngFor="let col of fieldMap.assetInputs" class="col-lg-6">
                       <div *ngFor="let group of col" class="form-group">
                         <div *ngFor="let input of group" [ngClass]="{'col-lg-6': group.length > 1, 'my-input-group': group.length > 1}">
                           <div *ngIf="input.type != 'area' && input.type != 'enum' && input.type != 'freq'">
                             <label htmlFor="{{input.field}}">{{input.label}}</label>
                             <input [type]="text" class="form-control" required [(ngModel)]="asset[input.field]" [name]="input.field" />
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
                             <input #addNew type="text" *ngIf="addNew.field == input.field" class="form-control" [(ngModel)]="addNew.label" [name]="input.field" (change)="onAddNew(input, addNew.label)"/>
                           </div>
                         </div>
                       </div>
                     </div>
                   </form>
                 </div>
                 <div class="col-lg-4">
                   <badass-attachment [user]="user" [asset]="asset"></badass-attachment>
                   <badass-booking-table *ngIf="bookings != undefined" [user]="user" [bookings]="bookings" (event)="onBookingEvent($event)"></badass-booking-table>
                 </div>
               </div>
             </div>
             <div id="confirmModal" class="modal fade" role="dialog">
               <div class="modal-dialog">
                 <div class="modal-content">
                   <div class="modal-header">
                     <button type="button" class="close" data-dismiss="modal">&times;</button>
                     <h4 class="modal-title">Confirm delete</h4>
                   </div>
                   <div class="modal-body">
                     Do you really want to delete the asset <i *ngIf="asset.manufacturer != undefined">{{asset.manufacturer | enum:'manufacturer'}} </i>{{asset.model}} {{asset.serial}}?
                   </div>
                   <div class="modal-footer">
                     <button type="button" class="btn btn-default" data-dismiss="modal" (click)="onDelete()">Delete</button>
                     <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                   </div>
                 </div>
               </div>
             </div>`,
  styles: ['.container-fluid { background: #f0fff0 }',
           '.my-input-group { padding: 0 5px 10px 0 }',
           '.my-input-group:last-child { padding-right: 0 }',
           'textarea { resize: none }',
           '.glyphicon:not(.disabled) { cursor: pointer }',
           '.checkOut { margin-left: 20px }',
           '.overdue { color: red }',
           '.disabled { color: lightgrey }',
           'badass-booking { display: block; height: 177px; overflow: auto }']
})
export class AssetComponent {
  private original: any;
  private asset: any = {};
  private freqs: any = {};
  private addNew: any = {};
  private url: any = {};

  @ViewChild('form') form: HTMLFormElement;
  @ViewChildren('addNew') addNewInput: QueryList<ElementRef>;

  @Input('user') user: User;
  @Output('event') event = new EventEmitter<any>();

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

  @Input('bookings') bookings: Bookings;

  @Input('search') search;

  constructor(private fieldMap: FieldMap, private enumService: EnumService, private dataService: DataService) {}

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
    return this.hasRole() && ! form.pristine && this.original != undefined;
  }

  onSave() {
    if (! this.canSave) return;
    this.event.emit({save: this.asset});
  }

  get canDelete() {
    return this.hasRole(true) && this.original != undefined;
  }

  onDelete() {
    if (! this.canDelete) return;
    this.event.emit({delete: this.original.id});
  }

  get canAdd() {
    return this.hasRole(true);
  }

  onAdd() {
    if (! this.canAdd) return;
    this.event.emit({add: this.asset});
    pristine(this.form, false);
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
