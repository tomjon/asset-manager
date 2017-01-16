export var ANONYMOUS = 0;
export var VIEW_ROLE = 1;
export var BOOK_ROLE = 2;
export var ADMIN_ROLE = 3;

export class User {
  public user_id: number;
  public role: number;
  public username: string;
  public label: string;
  public data: any;

  // only set when changing details
  public password: string;
  public new_password: string;

  constructor(role: number = ANONYMOUS) {
    this.role = role;
    this.data = {};
  }
}
