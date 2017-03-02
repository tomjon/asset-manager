import { BOOKED_DATE, SERIAL_NUMBER, FILTER_OPERATORS } from './field-map';

export class Filter {
  constructor(public column: string=BOOKED_DATE.column,
              public field: string=undefined,
              public operator: string=FILTER_OPERATORS[0].value,
              public value: any='NULL',
              public nullValue: boolean=true) {}
}
