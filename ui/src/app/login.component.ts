import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
import { EnumPipe } from './enum.pipe';
import { pristine } from './pristine';
import { User, ANONYMOUS, ADMIN_ROLE, BOOK_ROLE } from './user';

declare var $;

@Component({
  selector: 'badass-login',
  template: `<div *ngIf="loggedIn()">
               {{user.label}} ({{user.roleLabel}})
               <button class="btn" data-toggle="modal" data-target="#detailsModal" (click)="clearDetails()">Details</button>
               <button *ngIf="showUsers()" class="btn" data-toggle="modal" data-target="#usersModal" (click)="loadUsers()">Users</button>
               <button class="btn btn-default" (click)="onLogout()">Log out</button>
             </div>
             <div *ngIf="! loggedIn()">
               <table class="login">
                 <tr>
                   <td>
                     <label for="username">User Name</label>
                     <input type="text" [(ngModel)]="username" name="username" tabindex="1"/>
                   </td>
                   <td colspan="2"><button class="btn" (click)="onLogin()" tabindex="3">Log in</button></td>
                 </tr>
                 <tr>
                   <td>
                     <label for="password">Password</label>
                     <input type="password" [(ngModel)]="password" name="password" tabindex="2"/>
                   </td>
                 </tr>
               </table>
             </div>
             <div id="detailsModal" class="modal" role="dialog">
               <form role="form" #detailsForm="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h4 class="modal-title">Edit User Details for <b>{{formUser.username}}</b></h4>
                     </div>
                     <div class="modal-body">
                       <div class="form-group">
                         <label for="role">Role</label>
                         <select class="form-control" [disabled]="true" [(ngModel)]="formUser.role" name="role">
                           <option *ngFor="let o of enumService.get('role').options(false)" [value]="o.value">{{o.label}}</option>
                         </select>
                       </div>
                       <div class="form-group">
                         <label for="label">Display Name</label>
                         <input type="text" required class="form-control" [(ngModel)]="formUser.label" name="label" #f_label="ngModel">
                         <div [hidden]="f_label.valid" class="alert alert-danger">
                           Display Name is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="email">Email Address</label>
                         <input type="text" required class="form-control" [(ngModel)]="formUser.email" name="email" #f_email="ngModel">
                         <div [hidden]="f_email.valid" class="alert alert-danger">
                           Email Address is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="new_password">New Password (leave blank if not changing password)</label>
                         <input type="text" class="form-control" [(ngModel)]="formUser.new_password" name="new_password">
                       </div>
                       <div class="form-group">
                         <label for="label">Current Password</label>
                         <input type="password" required class="form-control" [(ngModel)]="formUser.password" name="password" #f_password="ngModel">
                         <div [hidden]="f_password.valid" class="alert alert-danger">
                           Password is required to change user details
                         </div>
                       </div>
                       <div *ngIf="error.status == 401" class="alert alert-danger">
                         You entered an incorrect password
                       </div>
                     </div>
                     <div class="modal-footer">
                       <button type="button" class="btn btn-default" [disabled]="detailsForm.pristine" (click)="onSubmitDetails()" [disabled]="! detailsForm.form.valid">Submit</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>
             <div id="usersModal" class="modal" role="dialog">
               <form role="form" #usersForm="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h4 class="modal-title">Users</h4>
                     </div>
                     <div class="modal-body">
                       <table class="users table table-responsive">
                         <thead>
                           <tr>
                             <th colspan="2"></th>
                             <th colspan="3" class="assets">Asset Summary</th>
                           </tr>
                           <tr>
                             <th>User</th>
                             <th>Role</th>
                             <th class="sh">Out</th>
                             <th class="sh">Booked</th>
                             <th class="sh">Overdue</th>
                           </tr>
                         </thead>
                         <tbody>
                           <tr *ngFor="let user of users">
                             <td><a href="mailto:{{user.email}}" title="Last log in {{user.last_login}}">{{user.label}}</a></td>
                             <td>{{user.role | enum:'role'}}</td>
                             <td>{{user.role >= book_role ? user.out : ''}}</td>
                             <td>{{user.role >= book_role ? user.booked : ''}}</td>
                             <td>{{user.role >= book_role ? user.overdue : ''}}</td>
                           </tr>
                         </tbody>
                       </table>
                     </div>
                     <div class="modal-footer">
                       <button type="button" class="btn btn-default" data-toggle="modal" data-target="#addUserModal" (click)="clearAddUser()">Add New User</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>
             <div id="addUserModal" class="modal fade" role="dialog">
               <form role="form" #addUserForm="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h4 class="modal-title">Add New User</h4>
                     </div>
                     <div class="modal-body">
                       <div class="form-group">
                         <label for="username">User Name</label>
                         <input type="text" required class="form-control" [(ngModel)]="newUser.username" name="username" #g_username="ngModel">
                         <div [hidden]="g_username.valid" class="alert alert-danger">
                           User Name is required
                         </div>
                         <div *ngIf="error.status == 409" class="alert alert-danger">
                           A user with that user name already exists
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="role">Role</label>
                         <select class="form-control" [(ngModel)]="newUser.role" name="role">
                           <option *ngFor="let o of enumService.get('role').options(false)" [value]="o.value">{{o.label}}</option>
                         </select>
                       </div>
                       <div class="form-group">
                         <label for="label">Display Name</label>
                         <input type="text" required class="form-control" [(ngModel)]="newUser.label" name="label" #g_label="ngModel">
                         <div [hidden]="g_label.valid" class="alert alert-danger">
                           Display Name is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="email">Email Address</label>
                         <input type="text" required class="form-control" [(ngModel)]="newUser.email" name="email" #g_email="ngModel">
                         <div [hidden]="g_email.valid" class="alert alert-danger">
                           Email Address is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="new_password">Initial Password</label>
                         <input type="text" required class="form-control" [(ngModel)]="newUser.new_password" name="new_password" #g_new_password="ngModel">
                         <div [hidden]="g_new_password.valid" class="alert alert-danger">
                           Initial Password is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="label">Admin Password</label>
                         <input type="password" required class="form-control" [(ngModel)]="newUser.password" name="password" #g_password="ngModel">
                         <div [hidden]="g_password.valid" class="alert alert-danger">
                           Your password is required to add a new user
                         </div>
                         <div *ngIf="error.status == 401" class="alert alert-danger">
                           You entered an incorrect password
                         </div>
                       </div>
                     </div>
                     <div class="modal-footer">
                       <button type="button" class="btn btn-default" [disabled]="addUserForm.pristine" (click)="onAddUser()" [disabled]="! detailsForm.form.valid">Submit</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>`,
  styles: ['table.login label { width: 90px }',
           'table.login input { width: 150px }',
           '.login td { text-align: right; padding: 2px }',
           'th.assets { background: lightgrey; text-align: center }',
           '.sh { width: 100px }']
})
export class LoginComponent {
  @Output('login') userEmitter = new EventEmitter<User>();

  private username: string;
  private password: string;

  user: User;
  formUser: User;
  newUser: User = new User(BOOK_ROLE);
  error: any = {};

  users: User[];
  book_role: number = BOOK_ROLE;

  @ViewChild('detailsForm') detailsForm;
  @ViewChild('addUserForm') addUserForm;

  @Input('user') set _user(user: User) {
    this.user = user;
    this.formUser = Object.assign({}, user);
    pristine(this.detailsForm);
  }

  constructor(private dataService: DataService, private enumService: EnumService) {}

  //FIXME these very similar - method on User, or make a user.service?
  loggedIn(): boolean {
    return this.user != undefined && this.user.role != ANONYMOUS;
  }

  showUsers(): boolean {
    return this.user != undefined && this.user.role == ADMIN_ROLE;
  }

  onLogin() {
    if (this.username && this.password) {
      this.dataService.login(this.username, this.password)
                      .subscribe(user => {
                        this.userEmitter.emit(user);
                      },
                      error => {
                        this.username = '';
                        this.password = '';
                      });
    }
  }

  onLogout() {
    this.dataService.logout()
                    .subscribe(() => {
                      this.userEmitter.emit(new User());
                      this.password = undefined;
                     });
  }

  onSubmitDetails() {
    this.dataService.updateDetails(this.formUser)
                    .subscribe(() => {
                      Object.assign(this.user, this.formUser);
                      $('#detailsModal').modal('hide');
                      this.clearDetails();
                    },
                    error => {
                      this.error = error;
                    });
  }

  onAddUser() {
    this.dataService.addUser(this.newUser)
                    .subscribe(() => {
                      this.users.push(Object.assign({out: 0, booked: 0, overdue: 0}, this.newUser));
                      $('#addUserModal').modal('hide');
                      this.clearAddUser();
                    },
                    error => {
                      this.error = error;
                    });
  }

  clearDetails() {
    this.error = {};
    this.formUser.password = undefined;
    this.formUser.new_password = undefined;
    pristine(this.detailsForm);
  }

  clearAddUser() {
    this.error = {};
    this.newUser = new User(BOOK_ROLE);
    pristine(this.addUserForm);
  }

  loadUsers() {
    if (this.user.role == ADMIN_ROLE) {
      this.dataService.getBookingSummary()
                      .subscribe(users => this.users = users);
    } else {
      this.users = [];
    }
  }
}
