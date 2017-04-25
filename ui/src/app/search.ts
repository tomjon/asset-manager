import { PAGE_SIZE } from './results';
import { FieldMap } from './field-map';

export class Search {
  constructor(fieldMap: FieldMap,
              public text: string="*",
              public start: number=0,
              public rows: number=PAGE_SIZE,
              public filters: any[]=[],
              public order: any={},
              public facets: string[]=[],
              public reload_enums: boolean=false) {
      this.facets = fieldMap.enumFields;
      this.filters.push(fieldMap.bookingFilters[0]); // project filter
      this.filters.push(fieldMap.bookingFilters[1]); // user filter
      for (let filter of this.filters) {
        filter.value = '*'; //FIXME these might have been changed by the user selection - not a good model :(
      }
  }

  get isResettable(): boolean {
    return this.text != '*' || this.start != 0 || this.rows != PAGE_SIZE
           || this.filters.length > 2 || this.order.asc != undefined
           || this.order.desc != undefined || this.filters[0].value != '*'
           || this.filters[1].value != '*';
  }
}
