export var FIRST_OPTION = {value: undefined, label: 'n/a'};
export var LAST_OPTION = {value: '#', label: 'Add new...'};

export class EnumValue {
  constructor(public value: string, public label: string, public order: number) {}
}

export class Enum {
  private optionsList: any[] = [];

  constructor(public field: string, public values: EnumValue[]=[]) {}

  public hasValue(value: string): boolean {
    return this.values.find(v => v.value == value) != undefined;
  }

  public update(values: EnumValue[]) {
    this.values = values;
  }

  public orderFromOptions(options: any[]) {
    this.values = [];
    let index = 0;
    for (let option of options) {
      this.values.push(new EnumValue(option.value, option.label, ++index));
    }
  }

  public addEnumValue(enumValue: EnumValue): EnumValue {
    this.values.push(enumValue);
    for (let options of this.optionsList) {
      options.push({value: enumValue.value, label: enumValue.label});
    }
    return enumValue;
  }

  public removeValue(value: string) {
    let index = this.values.findIndex(v => v.value == value);
    this.values.splice(index, 1);
  }

  public label(value: string): string {
    for (let e of this.values) {
      if (e.value == value) return e.label;
    }
    return undefined;
  }

  // create an options array and return it, but keep a reference to the returned
  // array - we might want to update it later
  public options(add_first: boolean, add_last: boolean): any[] {
    let ordered = [];
    for (let e of this.values) {
      ordered[e.order] = {value: e.value, label: e.label};
    }
    let options = [];
    this.optionsList.push(options);
    if (add_first) {
      options.push(FIRST_OPTION);
    }
    for (let o of ordered) {
      if (o) {
        options.push(o);
      }
    }
    if (add_last) {
      options.push(LAST_OPTION);
    }
    return options;
  }
}
