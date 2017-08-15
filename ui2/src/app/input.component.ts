import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'bass-input',
  template: `<div class="form-group">
               <label for="{{name}}"><ng-content select=".label"></ng-content>{{label}}</label>
               <input type="{{type}}" [attr.required]="required ? '' : null" [disabled]="disabled" class="form-control" [(ngModel)]="value" (input)="onChange()" name="{{name}}" #f_input="ngModel">
               <div [hidden]="getValid(f_input.valid)" class="alert alert-danger"><ng-content select=".warning"></ng-content>{{warning}}</div>
             </div>`,
  styles: []
})
export class InputComponent implements OnInit {

  // name for the input
  @Input() name: string;

  // input type
  @Input() type: string;

  // label for the input (specify either this or use )
  @Input() label: string;

  // is the input required?
  @Input() required: boolean = false;

  // is the input disabled?
  @Input() disabled: boolean = false;

  @Input() valid: Function = valid => true;

  // warning message if invalid (optional)
  @Input() warning: string;

  // the user input value
  private value: any;

  @Output() valueChange: EventEmitter<any> = new EventEmitter();

  constructor() { }

  ngOnInit() {
    if (this.name == null) throw new Error("name input is required");
    if (this.type == null) throw new Error("type input is required");
  }

  setValue(value: any) {
    this.value = value;
  }

  // use the supplied validation function (once our value is not undefined)
  getValid(inputValid) {
    return this.value == undefined || this.valid(inputValid);
  }

  onChange() {
    this.valueChange.emit(this.value);
  }

}
