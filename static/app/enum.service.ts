import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { DataService } from './data.service';
import { Enum } from './enum';

@Injectable()
export class EnumService {
  private enums: any = {};

  constructor (private dataService: DataService) {
    this.dataService.getEnums().subscribe(enums => {
      for (let field in enums) {
        if (! (field in this.enums)) {
          this.enums[field] = new Enum(field);
        }
        this.enums[field].update(enums[field]);
      }
    });
  }

  //FIXME not sure this will be right
  set(field: string, value: Enum): any {
    this.enums[field] = value;
    this.dataService.setEnum(field, value).subscribe();
  }

  get(field: string): Enum {
    if (! (field in this.enums)) {
      this.enums[field] = new Enum(field);
    }
    return this.enums[field];
  }
}
