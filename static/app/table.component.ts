import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Search } from './search';
import { Results } from './results';
import { EnumPipe } from './enum.pipe';
import { EnumService } from './enum.service';
import { FieldMap } from './field-map';

@Component({
  selector: 'bams-table',
  template: `<div class="container-fluid">
               <div class="row">
                 <table class="col-lg-12 table table-responsive">
                   <thead>
                     <tr>
                       <td colspan="6" class="title header">Assets Table</td>
                       <td colspan="3" class="calibration header">Calibration</td>
                       <td colspan="2"></td>
                     <tr>
                       <td *ngFor="let input of fieldMap.tableInputs">
                         <span class="header">{{input.short ? input.short : input.label}}</span>
                         <div *ngIf="showInput == input">
                           <input *ngIf="input.type == 'text'" [(ngModel)]="input.value" (ngModelChange)="doSearch()" (change)="showInput = undefined"/>
                           <select *ngIf="input.type == 'enum'" [(ngModel)]="input.value" (ngModelChange)="onFilter(input)">
                             <option *ngFor="let option of options(input)" [value]="option.value">{{option.label}}</option>
                           </select>
                         </div>
                         <div *ngIf="showInput != input">
                           <span class="glyphicon glyphicon-chevron-up" [ngClass]="{selected: search.order.asc == input.field, disabled: input.field == ''}" (click)="onOrderClick(input, true)"></span>
                           <span class="glyphicon glyphicon-chevron-down" [ngClass]="{selected: search.order.desc == input.field, disabled: input.field == ''}" (click)="onOrderClick(input, false)"></span>
                           <span class="glyphicon glyphicon-list" [ngClass]="{selected: filterSelected(input), disabled: input.field == ''}" (click)="onFilterClick(input)"></span>
                           <span class="glyphicon glyphicon-ban-circle" [ngClass]="{selected: emptySelected(input), disabled: input.field == ''}" (click)="onEmptyClick(input)"></span>
                         </div>
                       </td>
                     </tr>
                   </thead>
                   <tbody>
                     <tr *ngFor="let asset of results.assets; let even = even" [ngClass]="{'bg-primary': selected == asset, 'bg-success': even && selected != asset, 'normal': selected != asset}" (click)="onRowClick(asset)">
                       <td *ngFor="let input of fieldMap.tableInputs">
                         <span *ngIf="input.type == 'text'"><span class="hl">{{textValue(input, asset, true)}}</span>{{textValue(input, asset)}}</span>
                         <span *ngIf="input.type == 'date'">{{asset[input.field] | date:'dd/MM/yyyy'}}</span>
                         <span *ngIf="input.type == 'enum'" [ngClass]="{hl: search.filters.includes(input) && showInput != input}">{{asset[input.field] | enum:input.field}}</span>
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
           '.calibration { background: lightgrey; text-align: center }',
           'li { cursor: pointer }',
           'ul li:first-child a { cursor: default }',
           'tr.normal:hover { background: lightgrey }',
           '.glyphicon:not(.disabled) { color: grey; cursor: pointer }',
           '.glyphicon:hover:not(.disabled) { color: blue }',
           '.glyphicon.selected { color: black }',
           '.glyphicon.disabled { color: lightgrey }',
           'input { width: 100; position: absolute }',
           '.header, .hl { font-weight: bold }'],
  pipes: [EnumPipe]
})
export class TableComponent {
  selected: any;
  showInput: string;

  @Input('assets') results: Results;
  @Input('search') search: Search;

  @Output('event') eventEmitter = new EventEmitter<any>();

  constructor(private fieldMap: FieldMap, private enumService: EnumService) {}

  ngOnInit() {
    this.doSearch();
    this.search.facets = this.fieldMap.enumFields;
  }

  onRowClick(asset: any) {
    this.selected = this.selected != asset ? asset : undefined;
    this.eventEmitter.emit({asset: this.selected});
  }

  onNavigate(start: number) {
    if (start == undefined) return;
    this.doSearch(start);
  }

  doSearch(start:number=0) {
    this.search.start = start;
    this.eventEmitter.emit({search: true});
  }

  filterSelected(input: any): boolean {
    return this.search.filters.includes(input) && input.value != '-';
  }

  emptySelected(input: any): boolean {
    return this.search.filters.includes(input) && input.value == '-';
  }

  // click on input's filter icon - either remove filter or show select
  onFilterClick(input: any) {
    let index = this.search.filters.indexOf(input);
    if (index != -1 && input.value != '-') {
      this.search.filters.splice(index, 1);
      this.doSearch();
    } else {
      delete input.value;
      if (index == -1) this.search.filters.push(input);
      this.showInput = input;
    }
  }

  // click on input's empty icon - either remove filter or add filter
  onEmptyClick(input: any) {
    let index = this.search.filters.indexOf(input);
    if (index != -1 && input.value == '-') {
      this.search.filters.splice(index, 1);
      this.doSearch();
    } else {
      input.value = '-';
      if (index == -1) this.search.filters.push(input);
      this.doSearch();
    }
  }

  // select an enum value for an input
  onFilter(input: any) {
    this.showInput = undefined;
    this.doSearch();
  }

  // click on input's up or down chevron icons
  onOrderClick(input: any, asc: boolean) {
    if (input.field == '') return;
    let index = this.search.filters.indexOf(input);
    if (index != -1) {
      this.search.filters.splice(index, 1);
    }
    let reset = this.search.order[asc ? 'asc' : 'desc'] == input.field;
    this.search.order = {};
    if (! reset) this.search.order[asc ? 'asc' : 'desc'] = input.field;
    this.doSearch();
  }

  // return the display value for a text input
  // if filtered, use the hightlight parameter to decide whether to return the
  // highlighted prefix or the remaining portion
  textValue(input: any, asset: any, highlight: boolean=false): string {
    let value: string = asset[input.field] || '';
    let length = input.value != undefined ? input.value.length : 0;
    let index = this.filterSelected(input) ? length : 0;
    return highlight ? value.substring(0, index) : value.substring(index);
  }

  // return the display value for a range input
  rangeValue(input: any, asset: any): string {
    let start = asset[input.range[0].field];
    let end = asset[input.range[1].field];
    if (start != undefined && end != undefined) {
      return `${start} - ${end}`;
    } else {
      return '';
    }
  }

  options(input: any): any[] {
    let options = [];
    for (let option of this.enumService.get(input.field).options(false)) {
      let counts = this.results.facets[input.field];
      if (counts) {
        if (counts[option.value] == 0) continue;
        option.label += ` (${counts[option.value]})`;
      }
      options.push(option);
    }
    return options;
  }

  optionLabel(input: any, option: any): string {
    let label: string = option.label;
    let counts = this.results.facets[input.field];
    if (counts) {
      label += ` (${counts[option.value]})`;
    }
    return label;
  }
}
