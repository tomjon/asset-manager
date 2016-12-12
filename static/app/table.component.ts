import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Results } from './results';
import { EnumPipe } from './enum.pipe';

@Component({
  selector: 'bams-table',
  template: `<table>
               <tr>
                 <th (click)="onFilter('item')">Item</th>
                 <th (click)="onFilter('id_number')">ID Number</th>
                 <th (click)="onFilter('manufacturer')">Manufacturer</th>
                 <th (click)="onFilter('model')">Model</th>
                 <th (click)="onFilter('serial')">Serial Number</th>
                 <th (click)="onFilter('category')">Category</th>
                 <th (click)="onFilter('start_freq')">Start Freq (MHz)</th>
                 <th (click)="onFilter('stop_freq')">Stop Freq (MHz)</th>
                 <th (click)="onFilter('calibration_date')">Last Calibration</th>
                 <th (click)="onFilter('calibration_due')">Calibration Date</th>
                 <th (click)="onFilter('calibration_type')">Calibration Type</th>
                 <th (click)="onFilter('location')">Location</th>
                 <th (click)="onFilter('rack')">Rack</th>
                 <th (click)="onFilter('shelf')">Shelf</th>
                 <th (click)="onFilter('owner')">Owner</th>
                 <th (click)="onFilter('condition')">Condition</th>
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
  @Output('filter') filterEmitter = new EventEmitter<any>();

  onRowClick(asset: any) {
    this.selected = this.selected != asset ? asset : undefined;
    this.assetEmitter.emit(this.selected);
  }

  onNavigate(start: number) {
    this.searchEmitter.emit({start: start});
  }

  onFilter(field: string) {
    this.filterEmitter.emit(field);
  }
}
