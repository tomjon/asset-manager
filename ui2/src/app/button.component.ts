/**
 * Form button component. Doesn't add much, but enforces correct CSS classes and cursor behaviour.
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'bass-button',
  template: `<button class="btn btn-{{type}}" [disabled]="disabled" (click)="click.emit($event)"><ng-content></ng-content>{{label}}</button>`,
  styles: ['button:not([disabled]) { cursor: pointer }']
})
export class ButtonComponent {
  @Input() label: string;
  @Input() type: string = 'default';
  @Input() disabled: boolean;
  @Output() click: EventEmitter<any> = new EventEmitter();
}
