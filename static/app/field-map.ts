import { Injectable } from '@angular/core';

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

var FREQ_RANGE = {'field': '', 'label': 'Freq (MHz)', 'type': 'range', 'range': [START_FREQ, STOP_FREQ]};

@Injectable()
export class FieldMap {
  private map: any = {};

  public allInputs: any[] = [
    ITEM, CATEGORY, DESCRIPTION, START_FREQ, STOP_FREQ, CONDITION, ID_NUMBER,
    CALIBRATION_DATE, CALIBRATION_DUE, CALIBRATION_TYPE, LOCATION, RACK, SHELF,
    MANUFACTURER, MODEL, SERIAL_NUMBER, OWNER
  ];

  public assetInputs: any[] = [
    [[ITEM], [CATEGORY], [MANUFACTURER, MODEL], [DESCRIPTION], [START_FREQ, STOP_FREQ], [CONDITION]],
    [[ID_NUMBER], [CALIBRATION_DATE], [CALIBRATION_DUE], [CALIBRATION_TYPE], [LOCATION], [RACK, SHELF]]
  ];

  public tableInputs: any[] = [
    ITEM, ID_NUMBER, MANUFACTURER, MODEL, SERIAL_NUMBER, CATEGORY, FREQ_RANGE,
    CALIBRATION_DATE, CALIBRATION_DUE, CALIBRATION_TYPE, OWNER, CONDITION
  ];

  constructor() {
    for (let input of this.allInputs) {
      this.map[input.field] = input;
    }
  }

  public get(field: string): any {
    return Object.assign({}, this.map[field]); // copy the filter so we don't change the constants
  }
}
