import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { DataService } from './data.service';

@Injectable()
export class EnumService {

  private getEnums: Observable<any>; // observable for getting enums from server API
  private enums: any; // enums set by user, these override values from server API

  constructor (private dataService: DataService) {
    this.getEnums = this.dataService.getEnums().publishReplay(1).refCount();
    this.enums = {};
  }

  set(field: string, value: any): Observable<void> {
    this.enums[field] = value;
    return this.dataService.setEnum(field, value);
  }

  get(field: string): Observable<any> {
    if (this.enums[field] != undefined) {
      return Observable.of(this.enums[field]);
    }
    return this.getEnums.map(enums => enums[field] != undefined ? enums[field] : []);
  }
}
