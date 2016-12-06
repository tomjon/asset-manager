import { Component } from '@angular/core';
import { HTTP_PROVIDERS } from '@angular/http';
import { DataService } from './data.service';
import { TableComponent } from './table.component';
import { AssetComponent } from './asset.component';

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
                 <bams-asset [asset]="asset"></bams-asset>
               </div>
               <div class="row">
                 <div class="col-lg-12">
                   <bams-table [assets]="assets" (asset)="onasset($event)"></bams-table>
                 </div>
               </div>
             </div>`,
  directives: [TableComponent, AssetComponent],
  providers: [HTTP_PROVIDERS, DataService]
})
export class AppComponent {
  assets: any[] = [];
  asset: any = {};

  constructor(private dataService: DataService) { }

  ngOnInit() {
    //this.dataService.getCurrentUser()
    //                .subscribe(user => this.user = user);

    this.dataService.solr("*")
                    .subscribe(assets => this.assets = assets);
  }

  onasset(asset: any) {
    this.asset = asset;
  }
}
