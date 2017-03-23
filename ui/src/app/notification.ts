import { Trigger } from './trigger';

export class Notification {
  constructor(public notification_id: string='new', // note that ids obtained from the server are always integers
              public name: string='',
              public roles: string[]=[],
              public title_template: string='',
              public body_template: string='',
              public triggers: Trigger[]=[],
              public every: number=0,
              public offset: number=0,
              public run: Date=undefined) {}
}
