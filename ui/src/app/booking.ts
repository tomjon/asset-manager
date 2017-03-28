import { User, ADMIN_ROLE } from './user';
import { today } from './today';

// accommodates all the 'extra' fields provided by the server
export class Booking {
  constructor(public booking_id: string='',
              public asset_id: string='',
              public barcode: string='',
              public manufacturer: string='',
              public model: string='',
              public user_id: string='',
              public project: string='0',
              public condition: string=undefined,
              public due_out_date: string=undefined,
              public due_in_date: string=undefined,
              public in_date: string=undefined,
              public out_date: string=undefined,
              public asset_is_out: boolean=undefined,
              public notes: string='') {}

  get current(): boolean {
    return today() >= this.due_out_date && today() <= this.due_in_date && this.in_date == null;
  }

  // asset is 'out' if it has been taken out but not returned in
  get isOut(): boolean {
    return this.out_date && ! this.in_date;
  }

  // asset is 'back in' if it has been returned before the due in date
  get backIn(): boolean {
    return this.in_date && this.in_date <= this.due_in_date;
  }

  // asset is 'overdue out' if it has not been taken out, and today() is after the due out date;
  // but today() is also before the due in date, in case this is a lapsed booking
  get overdueOut(): boolean {
    return ! this.out_date && today() >= this.due_out_date && today() <= this.due_in_date;
  }

  // asset is 'overdue in' if it has been taken out, not returned in, and today() is after the due in date
  get overdueIn(): boolean {
    return this.out_date && ! this.in_date && today() >= this.due_in_date;
  }

  get lateOut(): boolean {
    return this.out_date > this.due_out_date;
  }

  get lateIn(): boolean {
    return this.in_date > this.due_in_date;
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

  private out_asset_ids: any;

  constructor(public type: string, public asset_id: string) {
    super();
  }

  checkAssets(): void {
    this.out_asset_ids = {};
    for (let booking of this) {
      if (booking.out_date && ! booking.in_date) {
        this.out_asset_ids[booking.asset_id] = true;
      }
    }
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

  canCheckOut(booking: Booking): boolean {
    return this.out_asset_ids[booking.asset_id] == undefined && booking.out_date == null && booking.in_date == null && today() >= booking.due_out_date && today() <= booking.due_in_date;
  }
}
