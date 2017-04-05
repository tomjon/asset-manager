export var ANONYMOUS = '0';
export var VIEW_ROLE = '1';
export var BOOK_ROLE = '2';
export var ADMIN_ROLE = '3';

export class User {
  public user_id: string;
  public role: string;
  public roleLabel: string;
  public username: string;
  public email: string;
  public label: string;
  public last_login: string;
  public logged_in: boolean;

  // only set when changing details
  public password: string;
  public new_password: string;

  constructor(role: string=ANONYMOUS) {
    this.role = role;
  }
}
