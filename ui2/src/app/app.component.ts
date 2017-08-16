import { Component } from '@angular/core';

@Component({
  selector: 'bass-app',
  template: `<bass-form #form [title]="value + ': ' + form.isValid + ' ' + form.isPristine">
               <h2 class="title">Hmm <span class="glyphicon glyphicon-info-sign"></span></h2>
               <bass-input type="text" required label="Label" warning="Don't be empty" [(ngModel)]="value"></bass-input>
               <bass-input type="text" [(ngModel)]="value" [valid]="valid">
                 <ng-container class="label">More</ng-container>
                 <ng-container class="warning">Be 'foo'</ng-container>
               </bass-input>
               <bass-input type="number" min="4" max="6" warning="Out of bounds" [(ngModel)]="n"></bass-input>
               <bass-button [disabled]="form.isPristine || ! form.isValid" (click)="form.pristine()" label="Submit"></bass-button>
               <bass-button [disabled]="form.isPristine" (click)="form.reset()" label="Reset"></bass-button>
               <bass-button [disabled]="true">No</bass-button>
               <bass-button label="Yes"><span class="glyphicon glyphicon-info-sign"></span>&nbsp;</bass-button>
             </bass-form>`
})
export class AppComponent {
  value: string = 'default';
  n: number | '' = '';

  get valid(): boolean {
    return this.value == 'foo';
  }
}
