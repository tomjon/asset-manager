/**
 * Very simple component for an info text line.
 */
import { Component } from '@angular/core';

@Component({
  selector: 'bass-info',
  template: `<span class="glyphicon glyphicon-info-sign"></span>&nbsp;<ng-content></ng-content>`,
  styles: ['bass-info { white-space: nowrap }']
})
export class InfoComponent {
}
