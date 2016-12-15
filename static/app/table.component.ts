import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Results } from './results';
import { EnumPipe } from './enum.pipe';
import { FieldMap } from './field-map';

@Component({
  selector: 'bams-table',
  template: `<div class="container-fluid">
               <div class="row">
                 <table class="col-lg-12 table table-responsive">
                   <thead>
                     <tr>
                       <th *ngFor="let input of fieldMap.tableInputs">
                         {{input.label}}
                         <div>
                           <span class="glyphicon glyphicon-chevron-up" [ngClass]="{selected: order.asc == input.field, disabled: input.field == ''}" (click)="onOrder(input.field, true)"></span>
                           <span class="glyphicon glyphicon-chevron-down" [ngClass]="{selected: order.desc == input.field, disabled: input.field == ''}" (click)="onOrder(input.field, false)"></span>
                           <span class="glyphicon glyphicon-filter" (click)="onFilter(input)"></span>
                         </div>
                       </th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr *ngFor="let asset of results.assets; let even = even" [ngClass]="{'bg-primary': selected == asset, 'bg-success': even && selected != asset, 'normal': selected != asset}" (click)="onRowClick(asset)">
                       <td *ngFor="let input of fieldMap.tableInputs">
                         <span *ngIf="input.type != 'date' && input.type != 'enum'">{{asset[input.field]}}</span>
                         <span *ngIf="input.type == 'date'">{{asset[input.field] | date:'dd/MM/yyyy'}}</span>
                         <span *ngIf="input.type == 'enum'">{{asset[input.field] | enum:input.field}}</span>
                         <span *ngIf="input.type == 'range'">{{rangeValue(input, asset)}}</span>
                       </td>
                     </tr>
                     <tr *ngIf="results.assets.length == 0">
                       <td colspan="100">No assets matching filters</td>
                     </tr>
                   </tbody>
                 </table>
                 <nav *ngIf="results.assets.length > 0" class="col-lg-12">
                   <ul class="pagination">
                      <li class="disabled"><a>{{results.start + 1}} - {{results.start + results.assets.length}} of {{results.total}} assets</a></li>
                      <li [ngClass]="{disabled: results.prev == undefined}" (click)="onNavigate(results.prev)"><a>&laquo;</a></li>
                      <li *ngFor="let page of results.pages()" [ngClass]="{active: page.start == undefined}" (click)="onNavigate(page.start)"><a>{{page.label}}</a></li>
                      <li [ngClass]="{disabled: results.next == undefined}" (click)="onNavigate(results.next)"><a>&raquo;</a></li>
                    </ul>
                  </nav>
                </div>
              </div>`,
  styles: ['table { white-space: nowrap }',
           'li { cursor: pointer }',
           'ul li:first-child a { cursor: default }',
           'tr.normal:hover { background: lightgrey }',
           'thead .glyphicon:not(.disabled) { color: grey; cursor: pointer }',
           'thead .glyphicon:hover:not(.disabled) { color: blue }',
           'thead .glyphicon.selected { color: black }',
           'thead .glyphicon.disabled { color: lightgrey }'],
  pipes: [EnumPipe]
})
export class TableComponent {
  selected: any;
  order: any = {};

  @Input('assets') results: Results;

  @Output('asset') assetEmitter = new EventEmitter<any>();
  @Output('search') searchEmitter = new EventEmitter<any>();
  @Output('filter') filterEmitter = new EventEmitter<any>();
  @Output('order') orderEmitter = new EventEmitter<any>();

  constructor(private fieldMap: FieldMap) {}

  onRowClick(asset: any) {
    this.selected = this.selected != asset ? asset : undefined;
    this.assetEmitter.emit(this.selected);
  }

  onNavigate(start: number) {
    if (start != undefined) this.searchEmitter.emit({start: start});
  }

  onFilter(input: any) {
    this.filterEmitter.emit(input);
  }

  onOrder(field: string, asc: boolean) {
    if (field == '') return;
    let reset = this.order[asc ? 'asc' : 'desc'] == field;
    this.order = {};
    if (! reset) this.order[asc ? 'asc' : 'desc'] = field;
    this.orderEmitter.emit(this.order);
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
