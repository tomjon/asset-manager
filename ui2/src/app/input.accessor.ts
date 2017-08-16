import { Directive, Provider, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { InputComponent } from './input.component';

const CUSTOM_VALUE_ACCESSOR: Provider = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => InputValueAccessor),
  multi: true
};

@Directive({
  selector: 'bass-input',
  host: {'(valueChange)': 'onChange($event)', '(blur)': 'onTouched()'},
  providers: [CUSTOM_VALUE_ACCESSOR]
})
export class InputValueAccessor implements ControlValueAccessor {
  onChange = (_) => {};
  onTouched = () => {};

  constructor(private host: InputComponent) { }

  writeValue(value: any): void {
    this.host.setValue(value);
  }

  registerOnChange(fn: (_: any) => void): void { this.onChange = fn }
  registerOnTouched(fn: () => void): void { this.onTouched = fn }
}
