import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'bass-app',
  template: `<h1>{{value}}</h1>
             <bass-input name="i1" type="text" label="Label" warning="Warning!" [(ngModel)]="value" [valid]="valid"></bass-input>
             <bass-input name="i2" type="text" [(ngModel)]="value" [valid]="valid">
               <ng-container class="label">More</ng-container>
               <ng-container class="warning">Don't be empty</ng-container>
             </bass-input>`,
  styles: []
})
export class AppComponent implements OnInit {
  value: string = 'default';

  constructor() {
  }

  ngOnInit() {
  }

  valid(valid) {
    return valid && this.value.length > 0;
  }
}
