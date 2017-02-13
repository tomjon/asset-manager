import { Component, trigger, transition, style, animate, state } from '@angular/core';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
import { TableComponent } from './table.component';
import { AssetComponent } from './asset.component';
import { LoginComponent } from './login.component';
import { Search } from './search';
import { Results } from './results';
import { FieldMap } from './field-map';
import { User } from './user';

//FIXME instance of Search to live in DataService? tidies up some dependencies

@Component({
  selector: 'badass-app',
  template: `<button (click)="show = !show">toggle show ({{show}})</button>
      <div class="container-fluid">
               <div class="row">
                 <div class="col-lg-12">
                   <h1><img src="/static/ofcom.gif"/> Baldock Asset Database and Scheduling System</h1>
                   <badass-login [user]="user" (login)="onLogin($event)"></badass-login>
                   <badass-asset [user]="user" [asset]="asset" [search]="search" (event)="onAssetEvent($event)"></badass-asset>
                   <div *ngIf="error" class="alert alert-danger">{{error.message}}</div>
                   <badass-table [user]="user" [assets]="results" [search]="search" [selected]="asset" (event)="onTableEvent($event)"></badass-table>
                 </div>
               </div>
             </div>`,
  styles: ['badass-asset { display: block; margin: 20px 0 20px 0 }',
           'badass-login { display: block; position: absolute; right: 10; top: 10 }']
})
export class AppComponent {
  user: User = new User(); // start with an anonymous user
  results: Results = new Results();
  search: Search = new Search();
  asset: any;
  error: any;

  show: boolean = false;

  constructor(private dataService: DataService, private enumService: EnumService, private fieldMap: FieldMap) { }

  ngOnInit() {
    this.dataService.getCurrentUser()
                    .subscribe(user => {
                      if (user.user_id) {
                        this.user = user; // don't overwrite the anonymous user
                      }
                    });
  }

  onLogin(user) {
    this.user = user;
  }

  doSearch() {
    this.dataService.search(this.search)
                    .subscribe(results => {
                      this.results = results;
                      this.enumService.setAll(results.enums);
                      this.error = undefined;
                    });
  }

  onAssetEvent(event: any) {
    if (event.save) {
      this.dataService.updateAsset(event.save)
                      .subscribe(() => {
                        this.asset = event.save;
                        this.doSearch();
                      },
                      error => {
                        this.error = error;
                      });
    }
    else if (event.delete) {
      this.dataService.deleteById(event.delete)
                      .subscribe(() => {
                        this.asset = undefined;
                        this.doSearch();
                      },
                      error => {
                        this.error = error;
                      });
    }
    else if (event.add) {
      this.dataService.addAsset(event.add)
                      .subscribe(id => {
                        this.asset = Object.assign({}, event.add);
                        this.asset.id = id;
                        this.doSearch();
                      },
                      error => {
                        this.error = error;
                      });
    }
    else {
      console.log("Bad event", event);
    }
  }

  onTableEvent(event: any) {
    if (event.asset !== undefined) {
      // event.asset == null indicates unselected table row
      this.asset = event.asset || undefined;
    }
    if (event.search) this.doSearch();
  }
}
