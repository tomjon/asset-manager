/**
 * Form button component. Doesn't add much, but enforces correct CSS classes and cursor behaviour.
 *
 * Note that an @Output emitter is not required because mouse events propagate to parents.
 */
import { Component, Input } from '@angular/core';

@Component({
  selector: 'bass-button',
  template: `<button class="btn btn-{{type}}" [disabled]="disabled"><ng-content></ng-content>{{label}}</button>`,
  styles: ['button:not([disabled]) { cursor: pointer }']
})
export class ButtonComponent {
  @Input() label: string;
  @Input() type: string = 'default';
  @Input() disabled: boolean;
}
