import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DataService } from './data.service';

@Component({
  selector: 'bams-table',
  template: `<table>
               <tr>
                 <th>Item</th>
                 <th>ID Number</th>
                 <th>Manufacturer</th>
                 <th>Model</th>
                 <th>Serial Number</th>
                 <th>Category</th>
                 <th>Start Freq (MHz)</th>
                 <th>Stop Freq (MHz)</th>
                 <th>Last Calibration</th>
                 <th>Calibration Date</th>
                 <th>Calibration Type</th>
                 <th>Location</th>
                 <th>Rack</th>
                 <th>Shelf</th>
                 <th>Owner</th>
                 <th>Comments</th>
                 <th>Condition</th>
                 <th>ID</th>
               </tr>
               <tr *ngFor="let item of items" (click)="onRowClick(item)">
                 <td>{{item.item}}</td>
                 <td>{{item.id_number}}</td>
                 <td>{{item.manufacturer}}</td>
                 <td>{{item.model}}</td>
                 <td>{{item.serial}}</td>
                 <td>{{item.category}}</td>
                 <td>{{item.start_freq}}</td>
                 <td>{{item.stop_freq}}</td>
                 <td>{{item.calibration_date | date:'dd/MM/yyyy'}}</td>
                 <td>{{item.calibration_due | date:'dd/MM/yyyy'}}</td>
                 <td>{{item.calibration_type}}</td>
                 <td>{{item.location}}</td>
                 <td>{{item.rack}}</td>
                 <td>{{item.shelf}}</td>
                 <td>{{item.owner}}</td>
                 <td>{{item.notes}}</td>
                 <td>{{item.condition}}</td>
                 <td>{{item.id}}</td>
               </tr>
             </table>`,
  directives: [],
  pipes: []
})
export class TableComponent {
  items: any[];

  @Output('item') itemEmitter = new EventEmitter<any>();

  constructor(private dataService: DataService) { }

  @Input('filter') set _doSearch(text: string) {
    this.dataService.solr(text)
                    .subscribe(items => this.items = items);
  }

  onRowClick(item: any): void {
    this.itemEmitter.emit(item);
  }
}
