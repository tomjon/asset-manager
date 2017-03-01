// accommodates all the 'extra' fields provided by the server
export class Booking {
  constructor(public booking_id: string='',
              public user_id: string='',
              public user_label: string='',
              public project: string='0',
              public project_label: string='',
              public due_out_date: string=undefined,
              public due_in_date: string=undefined,
              public in_date: string=undefined,
              public out_date: string=undefined) {}
}
