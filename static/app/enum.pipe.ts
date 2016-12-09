import { Pipe, PipeTransform } from '@angular/core';
import { EnumService } from './enum.service';
import { Observable } from 'rxjs/Observable';

export var NO_LABEL = '';

@Pipe({ name: 'enum' })
export class EnumPipe implements PipeTransform {
  constructor(private enumService: EnumService) {}

  // used in templates like: value | enum:field
  transform(value: string, field: string): Observable<string> {
    return this.enumService.get(field)
                           .map(enumValues => {
                             for (let e of enumValues) {
                               if (e.value == value) return e.label;
                             }
                             return NO_LABEL;
                           });
  }
}
