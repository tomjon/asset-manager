var ITEM = {'field': 'item', 'label': 'Item', 'type': 'text'};
var CATEGORY = {'field': 'category', 'label': 'Category', 'type': 'enum'};
var DESCRIPTION = {'field': 'description', 'label': 'Description', 'type': 'area'};
var START_FREQ = {'field': 'start_freq', 'label': 'Start Freq (MHz)', 'type': 'number'};
var STOP_FREQ = {'field': 'stop_freq', 'label': 'Stop Freq (MHz)', 'type': 'number'};
var CONDITION = {'field': 'condition', 'label': 'Condition', 'type': 'enum'};
var ID_NUMBER = {'field': 'id_number', 'label': 'ID Number', 'type': 'text'};
var CALIBRATION_DATE = {'field': 'calibration_date', 'label': 'Last Calibration', 'type': 'date'};
var CALIBRATION_DUE = {'field': 'calibration_due', 'label': 'Calibration Date', 'type': 'date'};
var CALIBRATION_TYPE = {'field': 'calibration_type', 'label': 'Calibration Type', 'type': 'enum'};
var LOCATION = {'field': 'location', 'label': 'Location', 'type': 'enum'};
var RACK = {'field': 'rack', 'label': 'Rack', 'type': 'enum'};
var SHELF = {'field': 'shelf', 'label': 'Shelf', 'type': 'enum'};
var MANUFACTURER = {'field': 'manufacturer', 'label': 'Manufacturer', 'type': 'enum'};
var MODEL = {'field': 'model', 'label': 'Model', 'type': 'text'};
var SERIAL_NUMBER = {'field': 'serial', 'label': 'Serial Number', 'type': 'text'};
var OWNER = {'field': 'owner', 'label': 'Owner', 'type': 'text'};

export var ALL_FIELDS: any[] = [
  ITEM, CATEGORY, DESCRIPTION, START_FREQ, STOP_FREQ, CONDITION, ID_NUMBER,
  CALIBRATION_DATE, CALIBRATION_DUE, CALIBRATION_TYPE, LOCATION, RACK, SHELF,
  MANUFACTURER, MODEL, SERIAL_NUMBER, OWNER
];

/**
 * This constant defines the structure of the asset display.
 */
export var ASSET_FIELDS: any[] = [
  [[ITEM], [CATEGORY], [MANUFACTURER, MODEL], [DESCRIPTION], [START_FREQ, STOP_FREQ], [CONDITION]],
  [[ID_NUMBER], [CALIBRATION_DATE], [CALIBRATION_DUE], [CALIBRATION_TYPE], [LOCATION], [RACK, SHELF]]
];

/**
 * This constant defines the headings for the table display.
 */
export var TABLE_FIELDS: any[] = [
  ITEM, ID_NUMBER, MANUFACTURER, MODEL, SERIAL_NUMBER, CATEGORY, START_FREQ, STOP_FREQ,
  CALIBRATION_DATE, CALIBRATION_DUE, CALIBRATION_TYPE, LOCATION, RACK, SHELF, OWNER, CONDITION
];

export class FieldMap {
  private map: any = {};

  constructor() {
    for (let input of ALL_FIELDS) {
      this.map[input.field] = input;
    }
  }

  public get(field: string): any {
    return this.map[field];
  }
}
