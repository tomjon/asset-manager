import { Component } from '@angular/core';
import { HTTP_PROVIDERS } from '@angular/http';
import { DataService } from './data.service';
import { TableComponent } from './table.component';
import { ItemComponent } from './item.component';

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
                 <bams-item [item]="item"></bams-item>
               </div>
               <div class="row">
                 <div class="col-lg-12">
                   <bams-table [items]="items" (item)="onItem($event)"></bams-table>
                 </div>
               </div>
             </div>`,
  directives: [TableComponent, ItemComponent],
  providers: [HTTP_PROVIDERS, DataService],
  pipes: []
})
export class AppComponent {
  items: any[] = [];
  item: any = {};

  constructor(private dataService: DataService) { }

  ngOnInit() {
    //this.dataService.getCurrentUser()
    //                .subscribe(user => this.user = user);

    this.dataService.solr("*")
                    .subscribe(items => this.items = items);
  }

  onItem(item: any) {
    this.item = item;
  }
}
