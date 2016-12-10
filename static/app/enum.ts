export class EnumValue {
  public value: string;
  public label: string;
  public order: number;
}

export class Enum {
  public values: EnumValue[] = [];

  public update(values: any[]) {
    this.values = values;
  }
}
