import { User, ADMIN_ROLE } from './user';

// accommodates all the 'extra' fields provided by the server
export class Booking {
  constructor(public booking_id: string='',
              public asset_id: string='',
              public user_id: string='',
              public user_label: string='',
              public project: string='0',
              public project_label: string='',
              public due_out_date: string=undefined,
              public due_in_date: string=undefined,
              public in_date: string=undefined,
              public out_date: string=undefined) {}

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
