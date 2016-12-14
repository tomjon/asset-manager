import { Component } from '@angular/core';
import { HTTP_PROVIDERS } from '@angular/http';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
import { TableComponent } from './table.component';
import { AssetComponent } from './asset.component';
import { FilterComponent } from './filter.component';
import { Results, PAGE_SIZE } from './results';
import { FieldMap } from './field-map';

// Add the RxJS Observable operators we need in this app
import './rxjs-operators';

@Component({
  selector: 'bams-app',
  template: `<div class="container-fluid">
               <div class="row">
                 <div class="col-lg-12">
                   <h1><img src="/static/ofcom.gif"/> Baldock Asset Management System</h1>
                   <bams-asset [asset]="asset" (event)="onEvent($event)"></bams-asset>
                   Filters: <bams-filter *ngFor="let filter of filters" [filter]="filter" (event)="onFilterEvent(filter, $event)"></bams-filter>
                   <bams-table [assets]="assets" (asset)="onAsset($event)" (search)="onSearch($event)" (filter)="onFilter($event)" (order)="onOrder($event)"></bams-table>
                 </div>
               </div>
             </div>`,
  directives: [TableComponent, AssetComponent, FilterComponent],
  providers: [HTTP_PROVIDERS, DataService, EnumService, FieldMap],
  styles: ['bams-filter { display: inline-block }']
})
export class AppComponent {
  assets: Results = new Results();
  asset: any;
  filters: any = [];
  order: any = {};

  constructor(private dataService: DataService, private fieldMap: FieldMap) { }

  ngOnInit() {
    //this.dataService.getCurrentUser()
    //                .subscribe(user => this.user = user);

    this.onSearch({start: 0});
  }

  onAsset(asset: any) {
    this.asset = asset;
  }

  onEvent(event: any) {
    if (event.save) {
      this.dataService.updateAsset(event.save)
                      .subscribe();
    }
    else if (event.delete) {
      this.dataService.deleteById(event.delete)
                      .subscribe();
    }
    else if (event.add) {
      this.dataService.addAsset(event.add)
                      .subscribe(id => event.add.id = id);
    }
    else {
      console.log("Bad event", event);
    }
  }

  onSearch(event: any) {
    this.dataService.search("*", event.start, PAGE_SIZE, this.filters, this.order)
                    .subscribe(assets => this.assets = assets);
  }

  onFilter(input: any) {
    if (input.type == 'enum') input.value = ''; // enums start with <any> selected
    this.filters.push(input);
  }

  onFilterEvent(filter: any, event: any) {
    if (event.close) {
      this.filters.splice(this.filters.indexOf(filter), 1);
    }
    this.onSearch({start: 0});
  }

  onOrder(order: any) {
    this.order = order;
    this.onSearch({start: 0});
  }
}
