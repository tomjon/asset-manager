import { Injectable } from '@angular/core';

var CATEGORY = {'field': 'category', 'label': 'Category', 'type': 'enum'};
var DESCRIPTION = {'field': 'description', 'label': 'Description', 'type': 'text'};
var START_FREQ = {'field': 'start_freq', 'label': 'Start Frequency', 'type': 'freq'};
var STOP_FREQ = {'field': 'stop_freq', 'label': 'Stop Frequency', 'type': 'freq'};
var CONDITION = {'field': 'condition', 'label': 'Condition', 'type': 'enum'};
var CONDITION_DATE = {'field': 'condition_date', 'label': 'Condition Updated', 'type': 'date'};
var FAR_ID = {'field': 'far_id', 'label': 'FAR ID', 'type': 'text'};
var SAP_ID = {'field': 'sap_id', 'label': 'SAP ID', 'type': 'text'};
//FIXME should be type: barcode and display an actual barcode
var BARCODE = {'field': 'barcode', 'label': 'Bar Code', 'type': 'text'};

// date_range value '<' means filter for dates before the input value, '>' means filter for dates after the input value
var CALIBRATION_DATE = {'field': 'calibration_date', 'label': 'Last Calibration', 'short': 'Last', 'type': 'date', 'date_range': '<', 'tip': 'On or before'};
var CALIBRATION_DUE = {'field': 'calibration_due', 'label': 'Calibration Due', 'short': 'Due', 'type': 'date', 'date_range': '>', 'tip': 'On or after'};
var CALIBRATION_TYPE = {'field': 'calibration_type', 'label': 'Calibration Type', 'short': 'Type', 'type': 'enum'};
export var CALIBRATION_FILTER = {'type': 'due', 'field': 'calibration_due', 'days': 7, 'tip': 'Show only assets due for calibration within 7 days, or overdue', 'glyph': 'warning-sign'};

var LOCATION = {'field': 'location', 'label': 'Location', 'type': 'enum'};
var RACK = {'field': 'rack', 'label': 'Rack', 'type': 'enum'};
var SHELF = {'field': 'shelf', 'label': 'Shelf', 'type': 'enum'};
var MANUFACTURER = {'field': 'manufacturer', 'label': 'Manufacturer', 'type': 'enum'};
var MODEL = {'field': 'model', 'label': 'Model', 'type': 'text'};
export var SERIAL_NUMBER = {'field': 'serial', 'label': 'Serial Number', 'type': 'text'};
var OWNER = {'field': 'owner', 'label': 'Owner', 'type': 'enum'};
var NOTES = {'field': 'notes', 'label': 'Notes', 'type': 'area'};
var AUDIT_DATE = {'field': 'audit_date', 'label': 'Audit Date', 'type': 'date'};
var PAT_DUE_DATE = {'field': 'pat_due_date', 'label': 'PAT Test Due', 'type': 'date'};
var URLS = {'field': 'url', 'label': 'URL', 'type': 'url'};

var FREQ_RANGE = {'field': '', 'label': 'Frequency', 'type': 'freq', 'range': [START_FREQ, STOP_FREQ], 'tip': 'Range includes'};

// enum definitions
var PROJECT = {'field': 'project', 'label': 'Project', 'type': 'enum'};
var USER = {'field': 'user', 'label': 'User', 'type': 'enum'};

// booking filters
export var BOOKING_PROJECT = {'type': 'xjoin', 'component': 'project', 'field': 'project', 'label': 'Project', 'value': '*'};
var BOOKING_USER = {'type': 'xjoin', 'component': 'user', 'field': 'user', 'label': 'User', 'value': '*'};
var BOOKING_OUT = {'type': 'xjoin', 'component': 'booking', 'field': 'out', 'glyph': 'export', 'value': 'now', 'tip': 'Show only assets that are currently out'}
var BOOKING_DUE_OUT = {'type': 'xjoin', 'component': 'booking', 'field': 'due', 'glyph': 'share', 'value': 'out', 'tip': 'Show only assets that are currently due to be taken out'}
var BOOKING_OVERDUE_IN = {'type': 'xjoin', 'component': 'booking', 'field': 'due', 'glyph': 'warning-sign', 'value': 'in', 'tip': 'Show only assets that are currently overdue to be returned'}
var BOOKING_AVAILABLE = {'type': 'xjoin', 'component': 'booking', 'field': 'unavailable', 'negative': true, 'glyph': 'ok-circle', 'date': true, 'value': 'now', 'tip': 'Show only assets that are available to book on the specified date'}

// allowed notification trigger and filter columns
export var BOOKED_DATE = {'column': 'booked_date', 'label': 'Booked Date'};
var DUE_OUT_DATE = {'column': 'due_out_date', 'label': 'Due Out Date'};
var DUE_IN_DATE = {'column': 'due_in_date', 'label': 'Due In Date'};
var OUT_DATE = {'column': 'out_date', 'label': 'Checked Out Date'};
var IN_DATE = {'column': 'in_date', 'label': 'Checked In Date'};

export var FILTER_OPERATORS = [
  {value: '==', label: '='},
  {value: '!=', label: '≠'},
  {value: '<', label: '<'},
  {value: '>', label: '>'},
  {value: '<=', label: '≤'},
  {value: '>=', label: '≥'}
];

@Injectable()
export class FieldMap {
  private map: any = {};

  public allInputs: any[] = [
    CATEGORY, DESCRIPTION, START_FREQ, STOP_FREQ, CONDITION, CONDITION_DATE, FAR_ID,
    CALIBRATION_DATE, CALIBRATION_DUE, CALIBRATION_TYPE, LOCATION, RACK, SHELF,
    MANUFACTURER, MODEL, SERIAL_NUMBER, OWNER, SAP_ID, BARCODE,
    AUDIT_DATE, PAT_DUE_DATE, URLS
  ];

  public assetInputs: any[] = [
    [[MANUFACTURER, MODEL], [CATEGORY], [DESCRIPTION], [START_FREQ, STOP_FREQ], [OWNER], [NOTES]],
    [[SERIAL_NUMBER, FAR_ID], [SAP_ID, BARCODE], [CALIBRATION_DATE, CALIBRATION_DUE], [CALIBRATION_TYPE, CONDITION], [LOCATION], [RACK, SHELF],
    [AUDIT_DATE, PAT_DUE_DATE], [URLS]]
  ];

  public tableInputs: any[] = [
    MANUFACTURER, MODEL, CATEGORY, SERIAL_NUMBER, BARCODE, FREQ_RANGE, CONDITION,
    CALIBRATION_DATE, CALIBRATION_DUE, CALIBRATION_TYPE, LOCATION, RACK, SHELF
  ];

  public projectInput: any = BOOKING_PROJECT;

  public bookingFilters: any[] = [
    BOOKING_PROJECT, BOOKING_USER, BOOKING_OUT, BOOKING_DUE_OUT, BOOKING_OVERDUE_IN, BOOKING_AVAILABLE
  ];

  public enumInputs: any[] = [];

  public enumFields: string[] = [];

  public triggerColumns: any[] = [
    BOOKED_DATE, DUE_OUT_DATE, DUE_IN_DATE, OUT_DATE, IN_DATE
  ];

  public triggerInputs: any[] = []; // built in constructor

  public filterColumns: any[] = [ //FIXME ? can add project, user here but only if you map ids to labels in the UI
    BOOKED_DATE, DUE_OUT_DATE, DUE_IN_DATE, OUT_DATE, IN_DATE
  ];

  public filterOperators: any[] = FILTER_OPERATORS;

  public conditionInput: any = CONDITION;

  constructor() {
    for (let input of this.allInputs) {
      this.map[input.field] = input;
      if (input.type == 'enum') {
        this.enumInputs.push(input);
        this.enumFields.push(input.field);
      }
      if (input.type == 'date') this.triggerInputs.push(input);
    }
    this.enumInputs.push(PROJECT);
    this.enumInputs.push(USER);
  }

  public get(field: string): any {
    return Object.assign({}, this.map[field]); // copy the filter so we don't change the constants
  }
}
