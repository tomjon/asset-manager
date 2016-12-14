import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Results } from './results';
import { EnumPipe } from './enum.pipe';
import { FieldMap } from './field-map';

@Component({
  selector: 'bams-table',
  template: `<div class="container-fluid">
               <div class="row">
                 <table class="col-lg-12">
                   <tr>
                     <th *ngFor="let input of fieldMap.tableInputs" (click)="onFilter(input.field)">{{input.label}}</th>
                   </tr>
                   <tr *ngFor="let asset of results.assets" (click)="onRowClick(asset)" [ngClass]="{selected: selected == asset}">
                     <td *ngFor="let input of fieldMap.tableInputs">
                       <span *ngIf="input.type != 'date' && input.type != 'enum'">{{asset[input.field]}}</span>
                       <span *ngIf="input.type == 'date'">{{asset[input.field] | date:'dd/MM/yyyy'}}</span>
                       <span *ngIf="input.type == 'enum'">{{asset[input.field] | enum:input.field}}</span>
                     </td>
                   </tr>
                 </table><!--
                 <button class="btn" [disabled]="results.prev == undefined"
                         (click)="onNavigate(results.prev)">&lt;&lt; Previous</button>
                 <button *ngFor="let page of results.pages()"
                         [ngClass]="{btn: true, selected: page.start == undefined}"
                         [disabled]="page.start == undefined"
                         (click)="onNavigate(page.start)">{{page.label}}</button>
                 <button class="btn" [disabled]="results.next == undefined"
                         (click)="onNavigate(results.next)">Next &gt;&gt;</button>-->
                <nav class="col-lg-12">
                  <ul class="pagination">
                     <li [ngClass]="{disabled: results.prev == undefined}" (click)="onNavigate(results.prev)"><a>&laquo;</a></li>
                     <li *ngFor="let page of results.pages()" [ngClass]="{active: page.start == undefined}" (click)="onNavigate(page.start)"><a>{{page.label}}</a></li>
                     <li [ngClass]="{disabled: results.next == undefined}" (click)="onNavigate(results.next)"><a>&raquo;</a></li>
                   </ul>
                 </nav>
               </div>
             </div>`,
  styles: ['li { cursor: pointer }'],
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
}
