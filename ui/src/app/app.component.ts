import { Component } from '@angular/core';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
import { Search } from './search';
import { Results } from './results';
import { User, ADMIN_ROLE, BOOK_ROLE, VIEW_ROLE } from './user';
import { Booking, Bookings } from './booking';

//FIXME instance of Search to live in DataService? tidies up some dependencies

@Component({
  selector: 'badass-app',
  template: `<div class="container-fluid">
               <div class="row">
                 <div class="col-lg-12">
                   <h1><img src="assets/ofcom.gif"/> Baldock Asset Database and Scheduling System</h1>
                   <badass-login [user]="user" (login)="onLogin($event)"></badass-login>
                   <button *ngIf="showNotifications()" class="btn" data-toggle="modal" data-target="#notificationsModal" (click)="loadNotifications()">Notifications</button>
                   <button *ngIf="showUserBookings()" class="btn" data-toggle="modal" data-target="#userBookingsModal" (click)="loadUserBookings()">My Bookings</button>
                   <badass-asset [user]="user" [asset]="asset" [search]="search" [bookings]="assetBookings" (event)="onEvent($event)"></badass-asset>
                   <div *ngIf="error" class="alert alert-danger">{{error.message}}</div>
                   <badass-table [user]="user" [assets]="results" [search]="search" [selected]="asset" (event)="onEvent($event)"></badass-table>
                 </div>
               </div>
             </div>
             <badass-booking [user]="user" [asset]="asset" [booking]="booking" (event)="onEvent($event)"></badass-booking>
             <badass-notification [notifications]="notifications"></badass-notification>
             <badass-user-bookings [user]="user" [bookings]="userBookings" (event)="onEvent($event)"></badass-user-bookings>
             <div id="blocker"></div>`,
  styles: ['div.container-fluid { margin-top: 10px }',
           'badass-asset { display: block; margin: 20px 0 20px 0 }',
           'h1 { display: inline }',
           'button { float: right; margin-right: 50px }',
           'badass-login { float: right }',
           '#blocker { position: fixed; left: 0; top: 0; width: 100%; height: 100%; background: black; opacity: 0.1 }']
})
export class AppComponent {
  user: User = new User(); // start with an anonymous user
  booking: Booking = new Booking(); // the booking currently being edited
  notifications: any[];
  assetBookings: Bookings;
  userBookings: Bookings;
  results: Results = new Results();
  search: Search = new Search();

  _asset: any; // the asset currently being viewed
  get asset(): any {
    return this._asset;
  }
  set asset(asset: any) {
    this._asset = asset;
    this.loadAssetBookings();
  }

  loadAssetBookings() {
    if (this.asset && this.asset.id && this.showBookings()) {
      this.dataService.getBookings(this.asset)
                      .subscribe(bookings => {
                        this.assetBookings = bookings;
                      });
    } else {
      this.assetBookings = undefined;
    }
  }

  error: any;

  constructor(private dataService: DataService, private enumService: EnumService) { }

  ngOnInit() {
    this.dataService.getCurrentUser()
                    .subscribe(user => {
                      if (user.user_id) {
                        this.onLogin(user);
                      }
                    });
  }

  //FIXME these very similar - method on User, or make a user.service?
  showNotifications(): boolean {
    return this.user != undefined && this.user.role == ADMIN_ROLE;
  }

  showUserBookings(): boolean {
    return this.user != undefined && this.user.role >= BOOK_ROLE;
  }

  showBookings(): boolean {
    return this.user != undefined && this.user.role >= VIEW_ROLE;
  }

  loadNotifications() {
    this.dataService.getNotifications().subscribe(notifications => this.notifications = notifications);
  }

  loadUserBookings() {
    this.dataService.getUserBookings(this.user).subscribe(userBookings => this.userBookings = userBookings);
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

  onEvent(event: any) {
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
                        let asset = Object.assign({}, event.add);
                        asset.id = id;
                        this.asset = asset;
                        this.doSearch();
                      },
                      error => {
                        this.error = error;
                      });
    }
    else if (event.book) {
      this.booking = new Booking();
    }
    else if (event.editBooking) {
      this.booking = event.editBooking;
    }
    else if (event.asset !== undefined) {
      // event.asset == null indicates unselected table row
      this.asset = event.asset || undefined;
    }
    else if (event.search) {
      this.doSearch();
    }
    else if (event.addUpdateBooking) {
      let index = this.assetBookings.findIndex(booking => booking.booking_id == event.addUpdateBooking.booking_id);
      if (index != -1) {
        this.assetBookings.splice(index, 1, event.addUpdateBooking);
      } else {
        this.assetBookings.push(event.addUpdateBooking);
      }
    }
    else if (event.check) {
      this.dataService.book(event.check.asset_id, event.check.out)
                      .subscribe(() => {
                        if (this.asset && event.check.asset_id == this.asset.id) {
                          this.loadAssetBookings();
                        }
                        if (event.check.user) {
                          this.loadUserBookings();
                        }
                      });
    }
    else {
      console.log("Bad event", event);
    }
  }
}
