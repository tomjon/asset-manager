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
                 </div>
               </div>
               <div class="row">
                 <bams-asset [asset]="asset" (event)="onEvent($event)"></bams-asset>
               </div>
               <div class="row">
                 <div *ngFor="let filter of filters">
                   <bams-filter [filter]="filter" (click)="onFilterClick(filter)"></bams-filter>
                 </div>
               </div>
               <div class="row">
                 <div class="col-lg-12">
                   <bams-table [assets]="assets" (asset)="onAsset($event)" (search)="onSearch($event)" (filter)="onFilter($event)"></bams-table>
                 </div>
               </div>
             </div>`,
  directives: [TableComponent, AssetComponent, FilterComponent],
  providers: [HTTP_PROVIDERS, DataService, EnumService]
})
export class AppComponent {
  fieldMap: FieldMap = new FieldMap();
  assets: Results = new Results();
  asset: any = {};
  filters: any = [];

  constructor(private dataService: DataService) { }

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
    this.dataService.search("*", event.start, PAGE_SIZE)
                    .subscribe(assets => this.assets = assets);
  }

  onFilter(field: string) {
    this.filters.push(Object.assign({}, this.fieldMap.get(field)));
  }

  onFilterClick(filter: any) {
    this.filters.splice(this.filters.indexOf(filter), 1);
  }
}
