import { Pipe, PipeTransform } from '@angular/core';
import { EnumService } from './enum.service';
import { Enum } from './enum';
import { Observable } from 'rxjs/Observable';

export var NO_LABEL = '';

@Pipe({ name: 'enum' })
export class EnumPipe implements PipeTransform {
  constructor(private enumService: EnumService) {}

  // used in templates like: value | enum:field
  transform(value: string, field: string): string {
    let label = this.enumService.get(field).label(value);
    return label != undefined ? label : NO_LABEL;
  }
}
