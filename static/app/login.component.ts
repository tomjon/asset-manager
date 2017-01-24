import { Component, Input, Output, ViewChild, ViewChildren, EventEmitter, ElementRef, QueryList } from '@angular/core';
import { DataService } from './data.service';
import { EnumService } from './enum.service';
import { EnumPipe } from './enum.pipe';
import { pristine } from './pristine';
import { User, ANONYMOUS, ADMIN_ROLE, BOOK_ROLE } from './user';

@Component({
  selector: 'badass-login',
  template: `<div *ngIf="loggedIn()">
               {{user.label}} ({{user.role | enum:'role'}})
               <button class="btn" data-toggle="modal" data-target="#detailsModal" (click)="clearDetails()">Details</button>
               <button *ngIf="user.role == ADMIN_ROLE" class="btn" data-toggle="modal" data-target="#addUserModal" (click)="clearAddUser()">Add user</button>
               <button class="btn btn-default" (click)="onLogout()">Log out</button>
             </div>
             <div *ngIf="! loggedIn()">
               <table>
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
             <div id="detailsModal" class="modal fade" role="dialog">
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
                     </div>
                     <div class="modal-footer">
                       <button type="button" class="btn btn-default" [disabled]="detailsForm.pristine" (click)="onSubmitDetails()" data-dismiss="modal" [disabled]="! detailsForm.form.valid">Submit</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Dismiss</button>
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
                       </div>
                     </div>
                     <div class="modal-footer">
                       <button type="button" class="btn btn-default" [disabled]="addUserForm.pristine" (click)="onAddUser()" data-dismiss="modal" [disabled]="! detailsForm.form.valid">Submit</button>
                       <button type="button" class="btn btn-default" data-dismiss="modal">Dismiss</button>
                     </div>
                   </div>
                 </div>
               </form>
             </div>`,
  styles: ['table label { width: 90px }',
           'table input { width: 150px }',
           'td { text-align: right; padding: 2px }'],
  pipes: [EnumPipe]
})
export class LoginComponent {
  @Output('login') userEmitter = new EventEmitter<User>();

  private username: string;
  private password: string;

  user: User;
  formUser: User;
  newUser: User = new User(BOOK_ROLE);

  @ViewChild('detailsForm') detailsForm;
  @ViewChild('addUserForm') addUserForm;

  @Input('user') set _user(user: User) {
    this.user = user;
    this.formUser = Object.assign({}, user);
    pristine(this.detailsForm);
  }

  constructor(private dataService: DataService, private enumService: EnumService) {}

  loggedIn(): boolean {
    return this.user != undefined && this.user.role != ANONYMOUS;
  }

  onLogin() {
    this.dataService.login(this.username, this.password)
                    .subscribe(user => {
                      if (user.user_id) {
                        this.userEmitter.emit(user);
                      } else {
                        this.username = '';
                        this.password = '';
                      }
                    });
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
                      this.clearDetails();
                    });
  }

  onAddUser() {
    this.dataService.addUser(this.newUser)
                    .subscribe(() => {
                      this.clearAddUser();
                    });
  }

  clearDetails() {
    this.formUser.password = undefined;
    this.formUser.new_password = undefined;
    pristine(this.detailsForm);
  }

  clearAddUser() {
    this.newUser = new User(BOOK_ROLE);
    pristine(this.addUserForm);
  }
}
