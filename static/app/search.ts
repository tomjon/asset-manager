import { PAGE_SIZE } from './results';

export class Search {
  constructor(public text: string="*",
              public start: number=0,
              public rows: number=PAGE_SIZE,
              public filters: any[]=[],
              public order: any={},
              public facets: string[]=[],
              public reload_enums: boolean=false) {}
}
