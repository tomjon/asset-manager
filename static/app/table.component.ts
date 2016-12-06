import { Component, Input, Output, EventEmitter } from '@angular/core';

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
               <tr *ngFor="let asset of assets" (click)="onRowClick(asset)" [ngClass]="{selected: selected == asset}">
                 <td>{{asset.item}}</td>
                 <td>{{asset.id_number}}</td>
                 <td>{{asset.manufacturer}}</td>
                 <td>{{asset.model}}</td>
                 <td>{{asset.serial}}</td>
                 <td>{{asset.category}}</td>
                 <td>{{asset.start_freq}}</td>
                 <td>{{asset.stop_freq}}</td>
                 <td>{{asset.calibration_date | date:'dd/MM/yyyy'}}</td>
                 <td>{{asset.calibration_due | date:'dd/MM/yyyy'}}</td>
                 <td>{{asset.calibration_type}}</td>
                 <td>{{asset.location}}</td>
                 <td>{{asset.rack}}</td>
                 <td>{{asset.shelf}}</td>
                 <td>{{asset.owner}}</td>
                 <td>{{asset.notes}}</td>
                 <td>{{asset.condition}}</td>
                 <td>{{asset.id}}</td>
               </tr>
             </table>`,
  styles: ['.selected { background: lightblue }']
})
export class TableComponent {
  selected: any;

  @Input('assets') assets: any[];

  @Output('asset') assetEmitter = new EventEmitter<any>();

  onRowClick(asset: any): void {
    this.selected = this.selected != asset ? asset : undefined;
    this.assetEmitter.emit(this.selected);
  }
}
