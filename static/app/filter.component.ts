import { Component, Input } from '@angular/core';

@Component({
  selector: 'bams-filter',
  template: `<h3>{{filter.label}}</h3>`
})
export class FilterComponent {
  @Input('filter') filter: any;
}
