import { Filter } from './filter';

export class Trigger {
  constructor(public column: string=undefined,
              public field: string=undefined,
              public days: number=0,
              public filters: Filter[]=[]) {}
}
