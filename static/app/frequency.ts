export var FREQ_UNITS = ['Hz', 'kHz', 'MHz', 'GHz'];

export class Frequency {
  private _value: number;
  private _units: number;

  constructor(private asset: any, private field: string) {
    let f = asset[field];
    let m = Math.floor(Math.log10(f) / 3) + 2;
    this._units = Math.min(Math.max(m, 0), FREQ_UNITS.length - 1);
    this._value = f * Math.pow(10, 6 - 3 * m);
  }

  private f(): number {
    return this._value * Math.pow(10, 3 * this._units - 6);
  }

  public get value(): number {
    return this._value || undefined;
  }

  public set value(value: number) {
    this._value = value;
    this.asset[this.field] = this.f();
  }

  public get units(): number {
    return this._units || undefined;
  }

  public set units(units: number) {
    this._units = units;
    this.asset[this.field] = this.f();
  }

  public label(): string {
    return `${this._value}${FREQ_UNITS[this._units]}`;
  }
}
