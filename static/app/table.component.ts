import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Results } from './results';
import { EnumPipe } from './enum.pipe';

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
               </tr>
               <tr *ngFor="let asset of results.assets" (click)="onRowClick(asset)" [ngClass]="{selected: selected == asset}">
                 <td>{{asset.item}}</td>
                 <td>{{asset.id_number}}</td>
                 <td>{{asset.manufacturer | enum:'manufacturer'}}</td>
                 <td>{{asset.model}}</td>
                 <td>{{asset.serial}}</td>
                 <td>{{asset.category | enum:'category'}}</td>
                 <td>{{asset.start_freq}}</td>
                 <td>{{asset.stop_freq}}</td>
                 <td>{{asset.calibration_date | date:'dd/MM/yyyy'}}</td>
                 <td>{{asset.calibration_due | date:'dd/MM/yyyy'}}</td>
                 <td>{{asset.calibration_type | enum:'calibration_type'}}</td>
                 <td>{{asset.location | enum:'location'}}</td>
                 <td>{{asset.rack | enum:'rack'}}</td>
                 <td>{{asset.shelf | enum:'shelf'}}</td>
                 <td>{{asset.owner | enum:'owner'}}</td>
                 <td>{{asset.notes}}</td>
                 <td>{{asset.condition | enum:'condition'}}</td>
               </tr>
             </table>
             <button class="btn" [disabled]="results.prev == undefined"
                     (click)="onNavigate(results.prev)">&lt;&lt; Previous</button>
             <button *ngFor="let page of results.pages()"
                     [ngClass]="{btn: true, selected: page.start == undefined}"
                     [disabled]="page.start == undefined"
                     (click)="onNavigate(page.start)">{{page.label}}</button>
             <button class="btn" [disabled]="results.next == undefined"
                     (click)="onNavigate(results.next)">Next &gt;&gt;</button>`,
  styles: ['.selected { background: lightblue }'],
  pipes: [EnumPipe]
})
export class TableComponent {
  selected: any;

  @Input('assets') results: Results;

  @Output('asset') assetEmitter = new EventEmitter<any>();
  @Output('search') searchEmitter = new EventEmitter<any>();

  onRowClick(asset: any) {
    this.selected = this.selected != asset ? asset : undefined;
    this.assetEmitter.emit(this.selected);
  }

  onNavigate(start: number) {
    this.searchEmitter.emit({start: start});
  }
}
