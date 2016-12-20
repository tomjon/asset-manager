export var FIRST_OPTION = {value: undefined, label: 'n/a'};
export var LAST_OPTION = {value: '#', label: 'Add new...'};

export class EnumValue {
  constructor(public value: string, public label: string, public order: number) {}
}

export class Enum {
  private values: EnumValue[] = [];

  constructor(private field: string) {}

  public update(values: any[]) {
    this.values = values;
  }

  public addEnumValue(enumValue: EnumValue): EnumValue {
    this.values.push(enumValue);
    return enumValue;
  }

  public label(value: string): string {
    if (value == FIRST_OPTION.value) {
      return FIRST_OPTION.label;
    }
    if (value == LAST_OPTION.value) {
      return LAST_OPTION.label;
    }
    for (let e of this.values) {
      if (e.value == value) return e.label;
    }
    return undefined;
  }

  public options(add_extra: boolean=true) {
    let options = [];
    for (let e of this.values) {
      options[e.order] = {value: e.value, label: e.label};
    }
    if (add_extra) {
      options.splice(0, 0, FIRST_OPTION);
      options.push(LAST_OPTION);
    }
    return options;
  }
}
