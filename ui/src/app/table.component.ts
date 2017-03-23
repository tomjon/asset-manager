import { Component, Input, Output, EventEmitter, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { Search } from './search';
import { Results } from './results';
import { User, BOOK_ROLE } from './user';
import { EnumPipe } from './enum.pipe';
import { EnumService } from './enum.service';
import { DataService } from './data.service';
import { FieldMap } from './field-map';
import { Frequency } from './frequency';

@Component({
  selector: 'badass-table',
  template: `<div class="container-fluid">
               <div class="row">
                 <table class="col-lg-12 table table-responsive">
                   <thead>
                     <tr>
                       <td colspan="6">
                         <div *ngIf="showBookingFilters" class="booking-filters">
                           <div *ngFor="let input of fieldMap.bookingFilters">
                             <label *ngIf="! input.glyph" [htmlFor]="input.field">{{input.label}}</label>
                             <select *ngIf="! input.glyph" [name]="input.field" [(ngModel)]="input.value" (ngModelChange)="doSearch()">
                               <option value="*">-- all assets --</option>
                               <option *ngFor="let o of options(input, false)" [value]="o.value">{{o.label}}</option>
                             </select>
                             <span *ngIf="input.glyph" title="{{input.description}}" class="glyphicon glyphicon-{{input.glyph}}" [ngClass]="{selected: filterSelected(input)}" (click)="onBookingFilterClick(input)"></span>
                             <input *ngIf="showInput == input" type="date" min="{{today}}" [(ngModel)]="showInput.value" (change)="doDateBookingFilter(showInput)" (blur)="doDateBookingFilter(showInput)" />
                             <span *ngIf="input.date && filterSelected(input) && showInput != input">{{input.value}}</span>
                           </div>
                         </div>
                       </td>
                       <td colspan="3" class="calibration header">Calibration</td>
                       <td colspan="2"></td>
                     </tr>
                     <tr>
                       <td *ngFor="let input of fieldMap.tableInputs">
                         <span class="header">{{input.short ? input.short : input.label}}</span>
                         <div *ngIf="showInput == input" class="filter">
                           <input #filter class="filter" *ngIf="input.type == 'text'" [(ngModel)]="input.value" (ngModelChange)="doSearch()" (change)="checkFilter(input)" (blur)="checkFilter(input)"/>
                           <input #filter class="freq" *ngIf="input.type == 'freq'" type="number" [(ngModel)]="input.value" (change)="checkRange(input)"/>
                           <select class="freq" *ngIf="input.type == 'freq'" [(ngModel)]="input.units" (ngModelChange)="checkRange(input)">
                             <option *ngFor="let o of unitOptions()" [value]="o.value">{{o.label}}</option>
                           </select>
                           <select #filter *ngIf="input.type == 'enum'" [(ngModel)]="input.value" (ngModelChange)="onFilter(input)" (blur)="checkFilter(input)">
                             <option *ngFor="let o of options(input)" [value]="o.value">{{o.label}} ({{o.count}})</option>
                           </select>
                         </div>
                         <div *ngIf="showInput != input">
                           <span class="glyphicon glyphicon-chevron-up" [ngClass]="{selected: orderSelected(input, true)}" (click)="onOrderClick(input, true)"></span>
                           <span class="glyphicon glyphicon-chevron-down" [ngClass]="{selected: orderSelected(input, false)}" (click)="onOrderClick(input, false)"></span>
                           <span class="glyphicon glyphicon-list" [ngClass]="{selected: filterSelected(input)}" (click)="onFilterClick(input)"></span>
                           <span class="glyphicon glyphicon-ban-circle" [ngClass]="{selected: emptySelected(input)}" (click)="onEmptyClick(input)"></span>
                           <span *ngIf="input.type == 'freq' && filterSelected(input)">({{freqLabel(input)}})</span>
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
                         <span *ngIf="input.type == 'freq'">{{rangeValue(input, asset)}}</span>
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
           'input.filter { width: 100px }',
           'input.freq { width: 60px }',
           'div.filter { position: absolute; z-index: 1 }',
           'input.freq { width: 80 }',
           'select.freq { width: 60 }',
           '.header, .hl { font-weight: bold }',
           '.booking-filters div { display: inline; margin-right: 10px }',
           '.booking-filters select { width: 200; background: white }'],
  //pipes: [EnumPipe]
})
export class TableComponent {
  showInput: any = {};

  @ViewChildren('filter') filters: QueryList<ElementRef>;

  private results: Results;
  @Input('assets') set _results(results: Results) {
    this.results = results;
    if (this.selected) {
      for (let asset of results.assets) {
        if (this.selected.id == asset.id) {
          this.selected = asset;
          break;
        }
      }
    }
  }

  @Input('user') user: User;
  @Input('selected') selected: any;
  @Input('search') search: Search;

  @Output('event') eventEmitter = new EventEmitter<any>();

  get showBookingFilters(): boolean {
    return this.user.role >= BOOK_ROLE;
  }

  constructor(private fieldMap: FieldMap, private enumService: EnumService, private dataService: DataService) {}

  ngOnInit() {
    this.search.facets = this.fieldMap.enumFields;
    this.search.filters.push(this.fieldMap.bookingFilters[0]); // project filter
    this.search.filters.push(this.fieldMap.bookingFilters[1]); // user filter
    this.doSearch();
  }

  //FIXME stolen from booking component
  get today(): string {
    return new Date().toISOString().substring(0, 10);
  }

  unitOptions() {
    return Frequency.unitOptions(false);
  }

  freqLabel(input: any) {
    return Frequency.label(input.value, input.units);
  }

  onRowClick(asset: any) {
    if (asset == this.selected) asset = null;
    this.eventEmitter.emit({asset: asset});
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
    return this.search.filters.indexOf(input) != -1 && input.value != '-';
  }

  emptySelected(input: any): boolean {
    return this.search.filters.indexOf(input) != -1 && input.value == '-';
  }

  // click on input's filter icon - either remove filter or show select/text input
  onFilterClick(input: any) {
    let index = this.search.filters.indexOf(input);
    if (index != -1 && input.value != '-') {
      this.search.filters.splice(index, 1);
      this.doSearch();
    } else {
      delete input.value;
      delete input.units;
      if (index == -1) this.search.filters.push(input);
      this.showInput = input;
      setTimeout(() => {
        let el = this.filters.first.nativeElement;
        el.focus();
        if (input.type == 'enum') {
          el.size = Math.min(el.options.length, 10);
        }
      });
    }
  }

  // click on input's empty icon - either remove filter or add filter
  onEmptyClick(input: any) {
    let index = this.search.filters.indexOf(input);
    if (index != -1 && input.value == '-') {
      this.search.filters.splice(index, 1);
    } else {
      input.value = '-';
      if (index == -1) this.search.filters.push(input);
    }
    this.doSearch();
  }

  // select an enum value for an input
  onFilter(input: any) {
    this.showInput = {};
    this.doSearch();
  }

  // once finished with a filter input, stop showing input, and check for empty value
  checkFilter(input: any) {
    this.showInput = {};
    if (input.value == undefined || input.value == '') {
      let index = this.search.filters.indexOf(input);
      this.search.filters.splice(index, 1);
    }
  }

  // decide whether to stop showing the range input, if so, is it valid (non empty)
  checkRange(input: any) {
    if (input.units != undefined) {
      this.checkFilter(input);
      this.doSearch();
    }
  }

  showRange(input: any) {
    this.showInput = input;
  }

  orderSelected(input: any, asc: boolean): boolean {
    if (input.type == 'freq') {
      input = input.range[asc ? 0 : 1];
    }
    return this.search.order[asc ? 'asc' : 'desc'] == input;
  }

  // click on input's up or down chevron icons
  onOrderClick(input: any, asc: boolean) {
    // remove any filter already added
    let index = this.search.filters.indexOf(input);
    if (index != -1) {
      this.search.filters.splice(index, 1);
    }
    // check for range and use lower or upper according to asc
    if (input.type == 'freq') {
      input = input.range[asc ? 0 : 1];
    }
    // now treat the input
    if (input.field == '') return;
    let reset = this.search.order[asc ? 'asc' : 'desc'] == input;
    this.search.order = {};
    if (! reset) this.search.order[asc ? 'asc' : 'desc'] = input;
    this.doSearch();
  }

  // return the display value for a text input
  // if filtered, use the highlight parameter to decide whether to return the
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
      if (input.range[0].type == 'freq') {
        start = new Frequency(asset, input.range[0].field).label();
        end = new Frequency(asset, input.range[1].field).label();
      }
      return `${start} - ${end}`;
    } else {
      return '';
    }
  }

  options(input: any, useCounts:boolean = true): any[] {
    if (! useCounts) {
      return this.enumService.get(input.field).options(false, false);
    }
    let options = [];
    for (let option of this.enumService.get(input.field).options(false, false)) {
      let counts = this.results.facets[input.field];
      option.count = counts && counts[option.value] ? counts[option.value] : 0;
      if (option.count > 0) options.push(option);
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

  // either clear the filter if already selected, or add to the search filters and clear any others
  onBookingFilterClick(input) {
    let has = this.search.filters.indexOf(input) != -1;
    this.search.filters = this.search.filters.filter(filter => filter.component != 'booking');
    if (! has) this.search.filters.push(input);
    if (! has && input.date) {
      this.showInput = input;
    } else {
      this.doSearch();
    }
  }

  doDateBookingFilter(input) {
    this.showInput = {};
    this.doSearch();
  }

  bookingFilterDate(): string {
    for (let filter of this.search.filters) {
      if (filter.type == 'xjoin' && filter.date) {
        return filter.value;
      }
    }
    return '';
  }
}
