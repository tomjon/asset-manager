export var FIRST_OPTION = 'n/a';
export var LAST_OPTION = 'Add new...';

export class EnumValue {
  public value: string;
  public label: string;
  public order: number;
}

export class Enum {
  private values: EnumValue[] = [];

  constructor(private field: string) {}

  public update(values: any[]) {
    this.values = values;
  }

  public label(value: string): string {
    for (let e of this.values) {
      if (e.value == value) return e.label;
    }
    return undefined;
  }

  public options() {
    let options = [{value: undefined, label: FIRST_OPTION}];
    for (let e of this.values) {
      options[1 + e.order] = {value: e.value, label: e.label};
    }
    options.push({value: null, label: LAST_OPTION}); //FIXME can we use a constant object here instead of null?
    return options;
  }
}
