import { Injectable } from '@angular/core';
import { LAST_OPTION } from './enum';

var CATEGORY = {'field': 'category', 'label': 'Category', 'type': 'enum'};
var DESCRIPTION = {'field': 'description', 'label': 'Description', 'type': 'text'};
var START_FREQ = {'field': 'start_freq', 'label': 'Start Frequency', 'type': 'freq'};
var STOP_FREQ = {'field': 'stop_freq', 'label': 'Stop Frequency', 'type': 'freq'};
var CONDITION = {'field': 'condition', 'label': 'Condition', 'type': 'enum'};
var ID_NUMBER = {'field': 'id_number', 'label': 'ID Number', 'type': 'text'};
var CALIBRATION_DATE = {'field': 'calibration_date', 'label': 'Last Calibration', 'short': 'Last', 'type': 'date'};
var CALIBRATION_DUE = {'field': 'calibration_due', 'label': 'Calibration Date', 'short': 'Date', 'type': 'date'};
var CALIBRATION_TYPE = {'field': 'calibration_type', 'label': 'Calibration Type', 'short': 'Type', 'type': 'enum'};
var LOCATION = {'field': 'location', 'label': 'Location', 'type': 'enum'};
var RACK = {'field': 'rack', 'label': 'Rack', 'type': 'enum'};
var SHELF = {'field': 'shelf', 'label': 'Shelf', 'type': 'enum'};
var MANUFACTURER = {'field': 'manufacturer', 'label': 'Manufacturer', 'type': 'enum'};
var MODEL = {'field': 'model', 'label': 'Model', 'type': 'text'};
var SERIAL_NUMBER = {'field': 'serial', 'label': 'Serial Number', 'type': 'text'};
var OWNER = {'field': 'owner', 'label': 'Owner', 'type': 'enum'};
var NOTES = {'field': 'notes', 'label': 'Notes', 'type': 'area'};

var FREQ_RANGE = {'field': '', 'label': 'Frequency', 'type': 'freq', 'range': [START_FREQ, STOP_FREQ]};

export var PROJECT = {'field': 'project', 'value': LAST_OPTION.value, 'label': 'Project'};

@Injectable()
export class FieldMap {
  private map: any = {};

  public allInputs: any[] = [
    CATEGORY, DESCRIPTION, START_FREQ, STOP_FREQ, CONDITION, ID_NUMBER,
    CALIBRATION_DATE, CALIBRATION_DUE, CALIBRATION_TYPE, LOCATION, RACK, SHELF,
    MANUFACTURER, MODEL, SERIAL_NUMBER, OWNER
  ];

  public assetInputs: any[] = [
    [[MANUFACTURER, MODEL], [CATEGORY], [DESCRIPTION], [START_FREQ, STOP_FREQ], [OWNER], [NOTES]],
    [[ID_NUMBER], [CONDITION], [CALIBRATION_DATE], [CALIBRATION_DUE], [CALIBRATION_TYPE], [LOCATION], [RACK, SHELF]]
  ];

  public tableInputs: any[] = [
    ID_NUMBER, MANUFACTURER, MODEL, SERIAL_NUMBER, CATEGORY, FREQ_RANGE,
    CALIBRATION_DATE, CALIBRATION_DUE, CALIBRATION_TYPE, OWNER, CONDITION
  ];

  public enumFields: string[] = [];

  constructor() {
    for (let input of this.allInputs) {
      this.map[input.field] = input;
      if (input.type == 'enum') this.enumFields.push(input.field);
    }
  }

  public get(field: string): any {
    return Object.assign({}, this.map[field]); // copy the filter so we don't change the constants
  }
}
