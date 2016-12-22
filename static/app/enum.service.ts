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

  /**
   * Add a new label to the enum for the specified field. Return the new value
   * if the label doesn't already exist, otherwise return the existing value.
   */
  addNewLabel(field: string, label: string): Observable<any> {
    return this.dataService.addNewEnumLabel(field, label)
                           .map(enumValue => this.enums[field].addEnumValue(enumValue));
  }

  get(field: string): Enum {
    if (! (field in this.enums)) {
      this.enums[field] = new Enum(field);
    }
    return this.enums[field];
  }
}
