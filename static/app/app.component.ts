import { Component } from '@angular/core';
import { HTTP_PROVIDERS } from '@angular/http';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
import { TableComponent } from './table.component';
import { AssetComponent } from './asset.component';
import { Search } from './search';
import { Results } from './results';
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
                   <bams-table [assets]="results" (select)="onSelect($event)" (search)="onSearch($event)"></bams-table>
                 </div>
               </div>
             </div>`,
  directives: [TableComponent, AssetComponent],
  providers: [HTTP_PROVIDERS, DataService, EnumService, FieldMap],
  styles: ['bams-filter { display: inline-block }']
})
export class AppComponent {
  results: Results = new Results();
  asset: any;

  constructor(private dataService: DataService, private fieldMap: FieldMap) { }

  ngOnInit() {
    //this.dataService.getCurrentUser()
    //                .subscribe(user => this.user = user);
  }

  onSelect(asset: any) {
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

  onSearch(search: Search) {
    this.dataService.search(search)
                    .subscribe(results => this.results = results);
  }
}
