/**
 * Bootstrap styled form input component with validation and warning.
 */
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'bass-input',
  template: `<div class="form-group">
               <label><ng-content select=".label"></ng-content>{{label}}</label>
               <input [attr.type]="type" [attr.disabled]="disabled" [attr.required]="required" [attr.min]="min" [attr.max]="max" class="form-control" [(ngModel)]="value" (input)="onInput()" name="{{name}}">
               <div [hidden]="isValid" class="alert alert-danger"><ng-content select=".warning"></ng-content>{{warning}}</div>
             </div>`
})
export class InputComponent {

  // input type
  @Input() type: string;

  // label for the input (specify either this or use)
  @Input() label: string;

  // properties passed straight on to <input>
  @Input() disabled: boolean;
  @Input() required: boolean;
  @Input() min: number;
  @Input() max: number;

  // whether the input value is valid, according to the parent (see isValid)
  @Input() valid: boolean = true;

  // warning message (optional)
  @Input() warning: string;

  // output event emitter (outputs input changes)
  @Output() valueChange: EventEmitter<any> = new EventEmitter();

  // the user input value
  private value: any;

  // original user input value
  private original: any;

  // InputValueAccessor calls this to set the input value (ngModel)
  setValue(value: any) {
    this.value = value;
    if (this.original == undefined && value != null) {
      this.original = value;
    }
  }

  // determine whether the input value is valid (if not we will display the warning)
  // undefined value means we aren't set up yet - be valid for now
  // since the #f_input="ngModel" doesn't support our conditionally assigned attributes, do required, min, max by hand
  // finally, use the supplied valid value
  get isValid(): boolean {
    if (this.value == undefined) return true;
    if (this.required != undefined && this.value.length == 0) return false;
    if (this.min != undefined && this.value < this.min) return false;
    if (this.max != undefined && this.value > this.max) return false;
    return this.valid;
  }

  get isPristine(): boolean {
    return this.value == this.original;
  }

  pristine(): void {
    this.original = this.value;
    this.onInput();
  }

  reset(): void {
    this.value = this.original;
    this.onInput();
  }

  // transmit input events to the component output emitter
  onInput() {
    this.valueChange.emit(this.value);
  }

}
