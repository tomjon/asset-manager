var FREQ_UNITS = ['Hz', 'kHz', 'MHz', 'GHz'];

export class Frequency {
  private _value: number;
  private _units: number;

  constructor(private asset: any, private field: string) {
    let f = asset[field];
    let m = Math.floor(Math.log10(f) / 3) + 2;
    this._units = Math.min(Math.max(m, 0), FREQ_UNITS.length - 1);
    this._value = f * Math.pow(10, 6 - 3 * m);
  }

  private setFreq(): void {
    this.asset[this.field] =  Frequency.freq(this._value, this._units);
  }

  public get value(): number {
    return this._value || undefined;
  }

  public set value(value: number) {
    this._value = value;
    this.setFreq();
  }

  public get units(): number {
    return this._units || undefined;
  }

  public set units(units: number) {
    this._units = units;
    this.setFreq();
  }

  public label(): string {
    return Frequency.label(this._value, this._units);
  }

  public static label(value: number, units: number): string {
    return `${value}${FREQ_UNITS[units]}`;
  }

  public static unitOptions(na: boolean=true): any[] {
    let options = na ? [{value: undefined, label: 'n/a'}] : [];
    for (let i: number = 0; i < FREQ_UNITS.length; ++i) {
      options.push({value: i, label: FREQ_UNITS[i]});
    }
    return options;
  }

  public static freq(value: number, units: number) {
    return value * Math.pow(10, 3 * units - 6);
  }
}
