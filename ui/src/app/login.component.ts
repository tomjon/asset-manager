import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
import { EnumPipe } from './enum.pipe';
import { EnumValue } from './enum';
import { pristine } from './pristine';
import { User, ANONYMOUS, ADMIN_ROLE, BOOK_ROLE } from './user';

declare var $;

@Component({
  selector: 'badass-login',
  template: `<div *ngIf="loggedIn()">
               {{user.label}} ({{user.roleLabel}})
               <button class="btn" data-toggle="modal" data-target="#detailsModal" (click)="clearDetails()">Details</button>
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
                       <h3 class="modal-title">User Manager</h3>
                     </div>
                     <div class="modal-body">
                       <table class="users table table-responsive">
                         <thead>
                           <tr>
                             <th *ngIf="canDelete()">&nbsp;</th>
                             <th colspan="2">&nbsp;</th>
                             <th colspan="3" class="assets">Asset Summary</th>
                           </tr>
                           <tr>
                             <th *ngIf="canDelete()">&nbsp;</th>
                             <th>User</th>
                             <th>Role</th>
                             <th class="sh">Out</th>
                             <th class="sh">Booked</th>
                             <th class="sh">Overdue</th>
                           </tr>
                         </thead>
                         <tbody>
                           <tr *ngFor="let u of users">
                             <td *ngIf="canDelete()">
                               <span *ngIf="u.user_id != user.user_id" class="glyphicon glyphicon-pencil" data-toggle="modal" data-target="#editUserModal" (click)="onEditUser(u)"></span>
                               <span *ngIf="! u.logged_in" class="glyphicon glyphicon-trash" data-toggle="modal" data-target="#deleteUserModal" (click)="actionUser = u"></span>
                             </td>
                             <td><a href="mailto:{{u.email}}" title="Last log in {{u.last_login}}">{{u.label}}</a></td>
                             <td>{{u.role | enum:'role'}}</td>
                             <td>{{u.role >= book_role ? u.out : ''}}</td>
                             <td>{{u.role >= book_role ? u.booked : ''}}</td>
                             <td>{{u.role >= book_role ? u.overdue : ''}}</td>
                           </tr>
                         </tbody>
                       </table>
                     </div>
                     <div class="modal-footer">
                       <span class="info">{{loggedInCount}} user{{loggedInCount == 1 ? '' : 's'}} logged in</span>
                       <button type="button" class="btn btn-default" data-toggle="modal" data-target="#editUserModal" (click)="clearAddUser()">Add New User</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>
             <div id="editUserModal" class="modal fade" role="dialog">
               <form role="form" #addUserForm="ngForm">
                 <div class="modal-dialog">
                   <div class="modal-content">
                     <div class="modal-header">
                       <button type="button" class="close" data-dismiss="modal">&times;</button>
                       <h4 *ngIf="actionUser == undefined" class="modal-title">Add New User</h4>
                       <h4 *ngIf="actionUser != undefined" class="modal-title">Edit User Details for <b>{{actionUser != undefined ? actionUser.username : ''}}</b></h4>
                     </div>
                     <div class="modal-body">
                       <div *ngIf="actionUser == undefined" class="form-group">
                         <label for="username">User Name</label>
                         <input type="text" required class="form-control" [(ngModel)]="editUser.username" name="username" #g_username="ngModel">
                         <div [hidden]="g_username.valid" class="alert alert-danger">
                           User Name is required
                         </div>
                         <div *ngIf="error.status == 409" class="alert alert-danger">
                           A user with that user name already exists
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="role">Role</label>
                         <select class="form-control" [(ngModel)]="editUser.role" name="role">
                           <option *ngFor="let o of enumService.get('role').options(false)" [value]="o.value">{{o.label}}</option>
                         </select>
                       </div>
                       <div class="form-group">
                         <label for="label">Display Name</label>
                         <input type="text" required class="form-control" [(ngModel)]="editUser.label" name="label" #g_label="ngModel">
                         <div [hidden]="g_label.valid" class="alert alert-danger">
                           Display Name is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="email">Email Address</label>
                         <input type="text" required class="form-control" [(ngModel)]="editUser.email" name="email" #g_email="ngModel">
                         <div [hidden]="g_email.valid" class="alert alert-danger">
                           Email Address is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="new_password">Password <span *ngIf="actionUser != undefined"> (leave blank if not changing password)</span></label>
                         <input type="text" required class="form-control" [(ngModel)]="editUser.new_password" name="new_password" #g_new_password="ngModel">
                         <div [hidden]="actionUser != undefined || g_new_password.valid" class="alert alert-danger">
                           Password is required
                         </div>
                       </div>
                       <div class="form-group">
                         <label for="label">Admin Password</label>
                         <input type="password" required class="form-control" [(ngModel)]="editUser.password" name="password" #g_password="ngModel">
                         <div [hidden]="g_password.valid" class="alert alert-danger">
                           Your admin password is required
                         </div>
                         <div *ngIf="error.status == 401" class="alert alert-danger">
                           You entered an incorrect password
                         </div>
                       </div>
                     </div>
                     <div class="modal-footer">
                       <button type="button" class="btn btn-default" [disabled]="addUserForm.pristine" (click)="onSubmitUser()" [disabled]="! detailsForm.form.valid">Submit</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>
             <div id="deleteUserModal" class="modal fade" role="dialog">
               <div class="modal-dialog">
                 <div class="modal-content">
                   <div class="modal-header">
                     <button type="button" class="close" data-dismiss="modal" data-target="#deleteUserModal">&times;</button>
                     <h4 class="modal-title">Confirm delete</h4>
                   </div>
                   <div class="modal-body">
                     Do you really want to delete <b>{{actionUser != undefined ? actionUser.label : ''}}</b>, along with all their future bookings and their booking history?
                   </div>
                   <div class="modal-footer">
                     <button type="button" class="btn btn-default" data-dismiss="modal" data-target="#deleteUserModal" (click)="onDelete()">Delete</button>
                     <button type="button" class="btn btn-default" data-dismiss="modal" data-target="#deleteUserModal">Cancel</button>
                   </div>
                 </div>
               </div>
             </div>`,
  styles: ['table.login label { width: 90px }',
           'table.login input { width: 150px }',
           '.login td { text-align: right; padding: 2px }',
           'th.assets { background: lightgrey; text-align: center }',
           '.sh { width: 100px }']
})
export class LoginComponent {
  @Input('users') users: User[];

  @Output('login') userEmitter = new EventEmitter<User>();

  private username: string;
  private password: string;

  user: User;
  formUser: User;
  editUser: User = new User(BOOK_ROLE);
  error: any = {};

  actionUser: User; // the user we might be editing or deleting

  book_role: string = BOOK_ROLE;

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

  get loggedInCount(): number {
    return this.users.filter(u => u.logged_in).length;
  }

  canDelete(): boolean {
    return this.user != undefined && this.user.role == ADMIN_ROLE;
  }

  onDelete() {
    this.dataService.deleteUser(this.actionUser.user_id)
                    .subscribe(() => {
                      let index = this.users.findIndex(u => u.user_id == this.actionUser.user_id);
                      this.users.splice(index, 1);
                      this.enumService.get('user').removeValue(this.actionUser.user_id);
                    });
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

  onEditUser(user: User) {
    this.actionUser = user;
    this.editUser = Object.assign({}, user);
  }

  onSubmitUser() {
    this.dataService.editUser(this.editUser, this.actionUser == undefined)
                    .subscribe(value => {
                      if (value != undefined) {
                        this.users.push(Object.assign({out: 0, booked: 0, overdue: 0}, this.editUser));
                      } else {
                        this.actionUser = Object.assign(this.actionUser, this.editUser);
                      }
                      $('#editUserModal').modal('hide');
                      this.clearAddUser();
                      if (value != undefined) {
                        let enumValue = new EnumValue(value, this.editUser.label, +value);
                        this.enumService.get('user').addEnumValue(enumValue);
                      }
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
    this.actionUser = undefined;
    this.error = {};
    this.editUser = new User(BOOK_ROLE); //FIXME can this be rolled into actionUser?
    pristine(this.addUserForm);
  }
}
