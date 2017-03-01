import { Trigger } from './trigger';

export class Notification {
  constructor(public notification_id: string='new', // ids obtained from the server are always integers
              public name: string='',
              public title_template: string='',
              public body_template: string='',
              public triggers: Trigger[]=[]) {}
}
