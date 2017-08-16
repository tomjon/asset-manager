import { Component } from '@angular/core';

@Component({
  selector: 'bass-app',
  template: `<bass-form #form title="My Modal Form">
               <bass-input type="text" required label="Label" warning="Don't be empty" [(ngModel)]="value"></bass-input>
               <bass-input type="text" [(ngModel)]="value" [valid]="value == 'foo'">
                 <ng-container class="label">More</ng-container>
                 <ng-container class="warning">Be 'foo'</ng-container>
               </bass-input>
               <bass-input type="number" min="4" max="6" warning="Out of bounds" [(ngModel)]="n" label="Number"></bass-input>
               <bass-info>Some info text</bass-info>
               <bass-info>Some more text</bass-info>
               <!--bass-button [disabled]="true">No</bass-button>
               <bass-button label="Yes"><span class="glyphicon glyphicon-info-sign"></span>&nbsp;</bass-button-->
             </bass-form>
             <bass-button (click)="form.show()">Show</bass-button>`,
  styles: ['bass-info {  }']
})
export class AppComponent {
  value: string = 'default';
  n: number | '' = '';
}
