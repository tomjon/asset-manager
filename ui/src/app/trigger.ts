import { Filter } from './filter';
import { BOOKED_DATE } from './field-map';

export class Trigger {
  constructor(public column: string=BOOKED_DATE.column,
              public field: string=undefined,
              public days: number=0,
              public filters: Filter[]=[]) {}
}
