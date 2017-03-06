import { User, ADMIN_ROLE } from './user';

// accommodates all the 'extra' fields provided by the server
export class Booking {
  constructor(public booking_id: string='',
              public asset_id: string='',
              public serial: string='',
              public manufacturer: string='',
              public model: string='',
              public user_id: string='',
              public project: string='0',
              public due_out_date: string=undefined,
              public due_in_date: string=undefined,
              public in_date: string=undefined,
              public out_date: string=undefined) {}

  private get today(): string {
    return new Date().toISOString().substring(0, 10);
  }

  get current(): boolean {
    return this.today >= this.due_out_date && this.today <= this.due_in_date && this.in_date == null;
  }

  // asset is 'out' if it has been taken out but not returned in
  get isOut(): boolean {
    return this.out_date && ! this.in_date;
  }

  get canCheckOut(): boolean {
    return ! this.out_date && this.today <= this.due_in_date && ! this.in_date;
  }

  // asset is 'back in' if it has been returned before the due in date
  get backIn(): boolean {
    return this.in_date && this.in_date <= this.due_in_date;
  }

  // asset is 'overdue out' if it has not been taken out, and today is after the due out date;
  // but today is also before the due in date, in case this is a lapsed booking
  get overdueOut(): boolean {
    return ! this.out_date && this.today >= this.due_out_date && this.today <= this.due_in_date;
  }

  // asset is 'overdue in' if it has been taken out, not returned in, and today is after the due in date
  get overdueIn(): boolean {
    return this.out_date && ! this.in_date && this.today >= this.due_in_date;
  }

  canEditProject(user: User): boolean {
    return this.canDelete(user);
  }

  canEditDueOutDate(user: User): boolean {
    return this.canDelete(user);
  }

  canEditDueInDate(user: User): boolean {
    return this.canEdit(user);
  }

  canEdit(user: User): boolean {
    let role: boolean = user.role == ADMIN_ROLE || user.user_id == this.user_id;
    return this.in_date == undefined && role;
  }

  canDelete(user: User): boolean {
    let role: boolean = user.role == ADMIN_ROLE || user.user_id == this.user_id;
    return this.out_date == undefined && this.in_date == undefined && role;
  }
}


export class Bookings extends Array<Booking> {
  static ASSET_TYPE = 'asset';
  static USER_TYPE = 'user';
  static PROJECT_TYPE = 'project';

  constructor(public type: string) {
    super();
  }

  get isByAsset(): boolean {
    return this.type == Bookings.ASSET_TYPE;
  }

  get isByUser(): boolean {
    return this.type == Bookings.USER_TYPE;
  }

  get isByProject(): boolean {
    return this.type == Bookings.PROJECT_TYPE;
  }
}
