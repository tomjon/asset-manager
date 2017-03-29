import { Component } from '@angular/core';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
import { Search } from './search';
import { Results } from './results';
import { DateRange } from './date-range';
import { User, ADMIN_ROLE, BOOK_ROLE, VIEW_ROLE } from './user';
import { Booking, Bookings } from './booking';

//FIXME instance of Search to live in DataService? tidies up some dependencies. There are now several 'globals'! :P :(

@Component({
  selector: 'badass-app',
  template: `<div class="container-fluid">
               <div class="row">
                 <div class="col-lg-12">
                   <h1><img src="assets/ofcom.gif"/> Baldock Asset Database and Scheduling System</h1>
                   <badass-login [user]="user" [users]="users" (login)="onLogin($event)"></badass-login>
                   <button *ngIf="showEnumerations()" class="btn" data-toggle="modal" data-target="#enumerationsModal">Enumerations</button>
                   <button *ngIf="showNotifications()" class="btn" data-toggle="modal" data-target="#notificationsModal" (click)="loadNotifications()">Notifications</button>
                   <button *ngIf="showUserBookings()" class="btn" data-toggle="modal" data-target="#userBookingsModal" (click)="loadUserBookings(); loadUsers()">Bookings</button>
                   <button *ngIf="showProjectBookings()" class="btn" data-toggle="modal" data-target="#projectBookingsModal">Projects</button>
                   <button *ngIf="showUsers()" class="btn" data-toggle="modal" data-target="#usersModal" (click)="loadUsers()">Users</button>
                   <badass-asset [user]="user" [asset]="asset" [search]="search" [range]="range" [bookings]="assetBookings" (event)="onEvent($event)"></badass-asset>
                   <div *ngIf="error" class="alert alert-danger">{{error.message}}</div>
                   <badass-table [user]="user" [assets]="results" [search]="search" [selected]="asset" (event)="onEvent($event)"></badass-table>
                 </div>
               </div>
             </div>
             <badass-booking [user]="user" [asset]="asset" [booking]="booking" (event)="onEvent($event)"></badass-booking>
             <badass-notification [notifications]="notifications"></badass-notification>
             <badass-enumerations #enumerations [search]="search"></badass-enumerations>
             <badass-user-bookings [user]="user" [users]="users" [range]="range" [bookings]="userBookings" (event)="onEvent($event)"></badass-user-bookings>
             <badass-project-bookings [user]="user" [range]="range" (event)="onEvent($event)"></badass-project-bookings>
             <badass-booking-condition [user]="user" [search]="search" [booking]="booking" (event)="onEvent($event)"></badass-booking-condition>
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
  users: User[] = []; // all users, only populated when user is an Admin
  booking: Booking = new Booking(); // the booking currently being edited (or selection of condition)
  notifications: any[];
  assetBookings: Bookings;
  userBookings: Bookings;
  results: Results = new Results();
  search: Search = new Search();
  range: DateRange = new DateRange();

  _asset: any; // the asset currently being viewed
  get asset(): any {
    return this._asset;
  }
  set asset(asset: any) {
    this._asset = asset;
    this.loadAssetBookings();
  }

  loadUsers() {
    if (this.user.role == ADMIN_ROLE) {
      this.dataService.getBookingSummary()
                      .subscribe(users => this.users = users);
    }
  }

  loadAssetBookings() {
    if (this.asset && this.asset.id && this.showBookings()) {
      this.dataService.getAssetBookings(this.asset, this.range)
                      .subscribe(bookings => {
                        this.assetBookings = bookings;
                      });
    } else {
      this.assetBookings = undefined;
    }
  }

  loadUserBookings() {
    this.dataService.getUserBookings(this.user.user_id, this.range).subscribe(userBookings => this.userBookings = userBookings);
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

  //FIXME these very similar - method on User, or make a user.service? Or a role service?
  showNotifications(): boolean {
    return this.user != undefined && this.user.role == ADMIN_ROLE;
  }

  showEnumerations(): boolean {
    return this.user != undefined && this.user.role == ADMIN_ROLE;
  }

  showUserBookings(): boolean {
    return this.user != undefined && this.user.role >= BOOK_ROLE;
  }

  showProjectBookings(): boolean {
    return this.user != undefined && this.user.role >= VIEW_ROLE;
  }

  showBookings(): boolean {
    return this.user != undefined && this.user.role >= VIEW_ROLE;
  }

  showUsers(): boolean {
    return this.user != undefined && this.user.role == ADMIN_ROLE;
  }

  loadNotifications() {
    this.dataService.getNotifications().subscribe(notifications => this.notifications = notifications);
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

  _updateBookings(asset_id: string, user: boolean) {
    if (this.asset && asset_id == this.asset.id) {
      this.loadAssetBookings();
    }
    if (user) {
      this.loadUserBookings();
    }
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
      if (this.assetBookings) {
        let index = this.assetBookings.findIndex(booking => booking.booking_id == event.addUpdateBooking.booking_id);
        if (index != -1) {
          this.assetBookings.splice(index, 1, event.addUpdateBooking);
        } else {
          this.assetBookings.push(event.addUpdateBooking);
        }
      }
    }
    else if (event.check) {
      if (event.check.out === true) {
        this.dataService.check(event.check.booking.asset_id)
                        .subscribe(() => this._updateBookings(event.check.booking.asset_id, event.check.user));
      } else if (event.check.out === null) {
        this.booking = event.check.booking;
        if (this.booking.condition == undefined) {
          this.booking.condition = this.asset.condition;
        }
      } else {
        this.dataService.check(event.check.booking.asset_id, event.check.booking.condition)
                        .subscribe(() => {
                          this._updateBookings(event.check.booking.asset_id, event.check.user);
                          this.doSearch();
                          if (this.asset.id == event.check.booking.asset_id) {
                            this.asset.condition = event.check.booking.condition;
                            this.asset = Object.assign({}, this.asset); //FIXME: force reload of asset in asset component
                          }
                        });
      }
    }
    else if (event.range) {
      this._updateBookings(event.range.asset_id, event.range.user);
      this.range = Object.assign({}, this.range); //FIXME: force change event for range inputs
    }
    else {
      console.log("Bad event", event);
    }
  }
}
