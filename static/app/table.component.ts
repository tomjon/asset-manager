import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Results } from './results';
import { EnumPipe } from './enum.pipe';
import { FieldMap } from './field-map';

@Component({
  selector: 'bams-table',
  template: `<div class="container-fluid">
               <div class="row">
                 <table class="col-lg-12 table table-responsive">
                   <tr>
                     <th *ngFor="let input of fieldMap.tableInputs" (click)="onFilter(input.field)">{{input.label}}</th>
                   </tr>
                   <tr *ngFor="let asset of results.assets; let even = even" [ngClass]="{'bg-primary': selected == asset, 'bg-success': even && selected != asset}" (click)="onRowClick(asset)">
                     <td *ngFor="let input of fieldMap.tableInputs">
                       <span *ngIf="input.type != 'date' && input.type != 'enum'">{{asset[input.field]}}</span>
                       <span *ngIf="input.type == 'date'">{{asset[input.field] | date:'dd/MM/yyyy'}}</span>
                       <span *ngIf="input.type == 'enum'">{{asset[input.field] | enum:input.field}}</span>
                       <span *ngIf="input.type == 'range'">{{rangeValue(input, asset)}}</span>
                     </td>
                   </tr>
                 </table>
                 <nav class="col-lg-12">
                   <ul class="pagination">
                      <li class="disabled"><a>{{results.start + 1}} - {{results.start + results.assets.length}} of {{results.total}} assets</a></li>
                      <li [ngClass]="{disabled: results.prev == undefined}" (click)="onNavigate(results.prev)"><a>&laquo;</a></li>
                      <li *ngFor="let page of results.pages()" [ngClass]="{active: page.start == undefined}" (click)="onNavigate(page.start)"><a>{{page.label}}</a></li>
                      <li [ngClass]="{disabled: results.next == undefined}" (click)="onNavigate(results.next)"><a>&raquo;</a></li>
                    </ul>
                  </nav>
                </div>
              </div>`,
  styles: ['li { cursor: pointer }', 'tr:hover { background: lightgrey }'],
  pipes: [EnumPipe]
})
export class TableComponent {
  selected: any;

  @Input('assets') results: Results;

  @Output('asset') assetEmitter = new EventEmitter<any>();
  @Output('search') searchEmitter = new EventEmitter<any>();
  @Output('filter') filterEmitter = new EventEmitter<any>();

  constructor(private fieldMap: FieldMap) {}

  onRowClick(asset: any) {
    this.selected = this.selected != asset ? asset : undefined;
    this.assetEmitter.emit(this.selected);
  }

  onNavigate(start: number) {
    if (start != undefined) this.searchEmitter.emit({start: start});
  }

  onFilter(field: string) {
    this.filterEmitter.emit(field);
  }

  rangeValue(input: any, asset: any): string {
    let start = asset[input.range[0].field];
    let end = asset[input.range[1].field];
    if (start != undefined && end != undefined) {
      return `${start} - ${end}`;
    } else {
      return '';
    }
  }
}
