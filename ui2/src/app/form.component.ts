import { Component, Input, ContentChildren, QueryList } from '@angular/core';
import { InputComponent } from './input.component';

@Component({
  selector: 'bass-form',
  template: `<h1 *ngIf="title != undefined">{{title}}</h1>
             <ng-content></ng-content>`
})
export class FormComponent {
  @Input() title: string;

  @ContentChildren(InputComponent) inputs: QueryList<InputComponent>;

  get isValid(): boolean {
    if (this.inputs == undefined) return true;
    return this.inputs.filter(input => ! input.isValid).length == 0;
  }

  get isPristine(): boolean {
    if (this.inputs == undefined) return true;
    return this.inputs.filter(input => ! input.isPristine).length == 0;
  }

  pristine(): void {
    this.inputs.forEach(input => input.pristine());
  }

  reset(): void {
    this.inputs.forEach(input => input.reset());
  }
}
