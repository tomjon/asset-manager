import { today } from './today';

export class DateRange {
  constructor(public use: boolean=false, public from: string=today(), public to: string=today()) {}
}
