import { Injectable } from '@angular/core';
import { Http, URLSearchParams, Headers, Response, RequestOptionsArgs } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Search } from './search';
import { Results } from './results';
import { Frequency } from './frequency';
import { User } from './user';
import { Notification } from './notification';
import { Booking, Bookings } from './booking';
import { DateRange } from './date-range';

export var DATETIME_RE = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/;
export var DATE_RE = /^\d\d\d\d-\d\d-\d\d$/;

declare var $;

@Injectable()
export class DataService {
  private base_url: string;

  constructor(private http: Http) {
    this.base_url = window.location.protocol + '//' + window.location.hostname + ":3389";
    $("#blocker").hide();
  }

  busy(obs: Observable<any>): Observable<any> {
    $("#blocker").show();
    return Observable.create(observer => {
      obs.subscribe(observer);
      return () => $("#blocker").hide();
    });
  }

  private wrap(http) {
    let self = this;
    return function() {
      let maybeOpts = arguments[arguments.length - 1];
      if (typeof(maybeOpts) == "RequestOptionsArgs") {
        maybeOpts.withCredentials = true;
      }
      return this.busy(http.apply(this, arguments)).catch(this.handleError);
    }.bind(self);
  }

  private get(path: string, args: RequestOptionsArgs={}, type: string='application/json'): Observable<any> {
    if (type != null) {
      args.headers = new Headers({'Content-Type': type});
    }
    args.withCredentials = true;
    return this.busy(this.http.get(`${this.base_url}/${path}`, args).catch(this.handleError));
  }

  private put(path: string, body: any, args: RequestOptionsArgs={}, type: string='application/json'): Observable<any> {
    if (type != null) {
      args.headers = new Headers({'Content-Type': type});
    }
    args.withCredentials = true;
    return this.busy(this.http.put(`${this.base_url}/${path}`, body, args).catch(this.handleError));
  }

  private delete(path: string, args: RequestOptionsArgs={}, type: string='application/json'): Observable<any> {
    if (type != null) {
      args.headers = new Headers({'Content-Type': type});
    }
    args.withCredentials = true;
    return this.busy(this.http.delete(`${this.base_url}/${path}`, args).catch(this.handleError));
  }

  private post(path: string, body: any, args: RequestOptionsArgs={}, type: string='application/json'): Observable<any> {
    if (type != null) {
      args.headers = new Headers({'Content-Type': type});
    }
    args.withCredentials = true;
    return this.busy(this.http.post(`${this.base_url}/${path}`, body, args).catch(this.handleError));
  }

  /**
   * A pair of functions to convert between date-times (2015-04-24T00:00:00Z)
   * and dates (2015-04-24). The alternative is to create a new SOLR field type
   * to store dates.
   */
  private _datetime2dateArray(docs: any[]): any[] {
    for (let doc of docs) {
      for (let key in doc) {
        if (DATETIME_RE.test(doc[key])) {
          doc[key] = doc[key].slice(0, 10);
        }
      }
    }
    return docs;
  }
  private _date2datetime(asset: any): any {
    let doc = {};
    for (let key in asset) {
      if (DATE_RE.test(asset[key])) {
        doc[key] = `${asset[key]}T00:00:00Z`;
      } else {
        doc[key] = asset[key];
      }
    }
    return doc;
  }

  search(search: Search): Observable<Results> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('q', search.text);
    params.set('start', search.start.toString());
    params.set('rows', (search.rows + 1).toString());
    if (search.facets.length > 0) {
      params.set('facets', search.facets.join(','));
    }
    if (search.reload_enums) {
      params.set('reload_enums', 'true');
      search.reload_enums = false;
    }

    let input = search.order.asc || search.order.desc;
    if (input) {
      let order = search.order.asc ? '>' : '<';
      let enumChar = input.type == 'enum' ? 'E' : '';
      params.set('order', `${enumChar}${order}${input.field}`);
    }

    let path = '';
    for (let input of search.filters) {
      if (input.type == 'freq') {
        if (input.value != '-') {
          if (input.value && input.units) {
            let f = Frequency.freq(input.value, input.units);
            path += `/${input.range[0].field},${input.range[1].field}:${f}`;
          }
        } else {
          path += `/-${input.range[0].field}:*/-${input.range[1].field}:*`;
        }
        continue;
      }
      if (input.type == 'xjoin') {
        if (input.value != '*') {
          path += `/xjoin_${input.component}_${input.field}:${input.negative ? '-' : ''}${input.value}`;
        }
        continue;
      }
      if (input.type == 'date') {
        // date filter: path component looks like /[FIELD]:VALUE
        // where the square brackets indicate a date field, and the value can
        // start with '<' or '>' to indicate before or after (inclusive)
        // (if omitted, equality is implied)
        path += `/[${input.field}]:${input.date_range}${input.value}`;
        continue;
      }
      if (input.type == 'due') {
        // date filter meaning range before now + input.days
        path += `/[${input.field}]:@${input.days}`;
        continue;
      }
      if (input.field == undefined || input.value == '') continue;
      let field = input.field;
      if (input.type == 'text') {
        field = `__${field}`;
      }
      if (input.value != '-') {
        path += `/${field}:${input.value}`;
      } else {
        path += `/-${field}:*`;
      }
    }
    return this.get(`search${path}`, {search: params})
               .map(res => {
                 let json = res.json();
                 let solr = json['solr'];
                 let start = solr.response.start;
                 let total = solr.response.numFound;
                 let assets = this._datetime2dateArray(solr.response.docs);
                 let facets = {};
                 if (solr.facet_counts) {
                   for (let field in solr.facet_counts.facet_fields) {
                     let values = solr.facet_counts.facet_fields[field];
                     facets[field] = {};
                     for (let i: number = 0; i < values.length; i += 2) {
                       facets[field][values[i]] = values[i + 1];
                     }
                   }
                 }
                 let projects = {};
                 for (let project of json.projects) {
                   projects[project.project_id] = project;
                 }
                 return new Results(start, total, assets, facets, json.enums, projects);
               });
  }

  updateAsset(asset: any): Observable<void> {
    let body = JSON.stringify(this._date2datetime(asset));
    return this.put(`asset/${asset.id}`, body);
  }

  addAsset(asset: any): Observable<string> {
    let body = JSON.stringify(this._date2datetime(asset));
    return this.post(`asset`, body)
               .map(res => res.json().id);
  }

  getAsset(id: string): Observable<any> {
    return this.get(`asset/${id}`)
               .map(res => {
                 let assets = this._datetime2dateArray([res.json()]);
                 return assets.length > 0 ? assets[0] : {};
               });
  }

  deleteById(id: string): Observable<void> {
    return this.delete(`asset/${id}`);
  }

  loadAttachments(folder_id: number): Observable<any> {
    let params: URLSearchParams = new URLSearchParams();
    if (folder_id != undefined) {
      params.set('folder_id', `${folder_id}`);
    }
    return this.get(`file`, {search: params})
               .map(res => res.json());
  }

  deleteAttachment(attachment_id: number): Observable<void> {
    return this.delete(`file/${attachment_id}`);
  }

  addFolder(name: string, parent_id: number): Observable<string> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('name', name);
    if (parent_id != undefined) {
      params.set('parent_id', `${parent_id}`);
    }
    return this.post(`folder`, null, {search: params}).map(rsp => rsp.json().folder_id);
  }

  renameFolder(folder_id: number, name: string): Observable<void> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('folder_id', `${folder_id}`);
    params.set('name', name);
    return this.put(`folder/${folder_id}`, null, {search: params});
  }

  deleteFolder(folder_id: number): Observable<void> {
    return this.delete(`folder/${folder_id}`);
  }

  // move folders and attachments to the specified folder
  moveItems(folder_id: string, folders: number[], attachments: number[]) {
    if (folder_id == undefined) {
      folder_id = '-'; // for this endpoint only, root folder is identified by '-'
    }
    let body = JSON.stringify({folders: folders, attachments: attachments});
    return this.post(`folder/${folder_id}`, body);
  }

  uploadAttachment(name: string, file: FileList, folder_id: number): Observable<any> {
    let params: URLSearchParams = new URLSearchParams();
    if (folder_id != undefined) {
      params.set('folder_id', `${folder_id}`);
    }
    params.set('name', name);
    return this.post(`file`, file, {search: params}, null)
               .map(res => res.json());
  }

  getAttachments(asset: any): Observable<any[]> {
    return this.get(`attachment/${asset.id}`)
               .map(res => res.json());
  }

  renameAttachment(attachment_id: number, name: string): Observable<void> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('attachment_id', `${attachment_id}`);
    params.set('name', name);
    return this.put(`file/${attachment_id}`, null, {search: params});
  }

  addAssociation(asset: any, attachment_id: number): Observable<void> {
    return this.put(`attachment/${asset.id}/${attachment_id}`, null);
  }

  removeAssociation(asset: any, attachment_id: number): Observable<void> {
    return this.delete(`attachment/${asset.id}/${attachment_id}`);
  }

  getCurrentUser(): Observable<User> {
    return this.get(`user`)
               .map(res => res.json());
  }

  getBookingSummary(): Observable<User[]> {
    return this.get(`user/admin`)
               .map(res => res.json());
  }

  updateDetails(user: User): Observable<void> {
    return this.put(`user`, JSON.stringify(user));
  }

  addUser(user: User): Observable<string> {
    return this.post(`user/admin`, JSON.stringify(user))
               .map(res => res.json().value);
  }

  deleteUser(user_id: string): Observable<void> {
    return this.delete(`user/admin/${user_id}`);
  }

  login(username: string, password: string): Observable<User> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('username', username);
    let body = JSON.stringify({password: password});
    return this.post(`login`, body, {search: params})
               .map(res => res.json());
  }

  logout(): Observable<void> {
    return this.get(`logout`);
  }

  private bookingArray(json: any[], type: string, asset_id: string=undefined): Bookings {
    let bookings: Bookings = new Bookings(type, asset_id);
    for (let booking of json) {
      bookings.push(Object.assign(new Booking(), booking));
    }
    bookings.checkAssets();
    return bookings;
  }

  getAssetBookings(asset: any, range: DateRange): Observable<Bookings> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('asset_id', asset.id);
    if (range != undefined && range.use) {
      params.set('fromDate', range.from);
      params.set('toDate', range.to);
    }
    return this.get(`booking`, {search: params})
               .map(res => this.bookingArray(res.json().bookings, Bookings.ASSET_TYPE, asset.id));
  }

  getUserBookings(user_id: string, range: DateRange): Observable<Bookings> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('user_id', user_id);
    if (range != undefined && range.use) {
      params.set('fromDate', range.from);
      params.set('toDate', range.to);
    }
    return this.get(`booking`, {search: params})
               .map(res => this.bookingArray(res.json().bookings, Bookings.USER_TYPE));
  }

  getProject(project_id: string, range: DateRange): Observable<{project: any, bookings: Bookings}> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('project', project_id);
    if (range != undefined && range.use) {
      params.set('fromDate', range.from);
      params.set('toDate', range.to);
    }
    return this.get(`booking`, {search: params})
               .map(res => {
                 let values = res.json();
                 values.bookings = this.bookingArray(values.bookings, Bookings.PROJECT_TYPE);
                 return values;
               });
  }

  setProjectActiveState(project_id: string, state: boolean): Observable<void> {
    if (state) {
      return this.put(`project/${project_id}`, null);
    } else {
      return this.delete(`project/${project_id}`);
    }
  }

  deleteBooking(booking: Booking): Observable<void> {
    return this.delete(`booking/${booking.booking_id}`);
  }

  // add or update a booking (if editFields is undefined, we are adding)
  updateBooking(booking: Booking, editFields: any): Observable<Booking> {
    let params: URLSearchParams = new URLSearchParams();
    if (! editFields) {
      params.set('asset_id', booking.asset_id);
    }
    if (! editFields || editFields.project) {
      params.set('project', booking.project);
    }
    if (! editFields || editFields.dueOutDate) {
      params.set('due_out_date', booking.due_out_date);
    }
    if (! editFields || editFields.dueInDate) {
      params.set('due_in_date', booking.due_in_date);
    }
    let obs: Observable<any> = editFields ? this.put(`booking/${booking.booking_id}`, booking.notes, {search: params})
                                          : this.post(`booking`, booking.notes, {search: params});
    return obs.map(res => res.json());
  }

  // no condition means we are checking out, otherwise checking in
  check(asset_id: string, condition: string=undefined): Observable<void> {
    return this.put(`check/${asset_id}`, condition);
  }

  getNotifications(): Observable<Notification[]> {
    return this.get(`notification`).map(res => res.json());
  }

  addNotification(notification: Notification): Observable<Notification> {
    return this.post(`notification`, JSON.stringify(notification)).map(res => res.json());
  }

  updateNotification(notification: Notification): Observable<Notification> {
    return this.put(`notification/${notification.notification_id}`, JSON.stringify(notification))
               .map(res => res.json());
  }

  deleteNotification(notification_id: string): Observable<void> {
    return this.delete(`notification/${notification_id}`);
  }

  resetNotification(notification_id: string): Observable<void> {
    return this.post(`notification/${notification_id}`, null);
  }

  saveEnumeration(field: string, values: any[]): Observable<void> {
    return this.put(`enum/${field}`, JSON.stringify(values));
  }

  addNewEnumLabel(field: string, label: any): Observable<any> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('action', 'add_label');
    return this.post(`enum/${field}`, label, {search: params})
               .map(res => res.json());
  }

  pruneEnumeration(field: string): Observable<any[]> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('action', 'prune');
    return this.post(`enum/${field}`, null, {search: params})
               .map(res => res.json());
  }

  sortEnumeration(field: string): Observable<any[]> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('action', 'sort');
    return this.post(`enum/${field}`, null, {search: params})
               .map(res => res.json());
  }

  mergeEnumeration(field: string, source: number, target: number): Observable<any[]> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('action', 'merge');
    return this.post(`enum/${field}`, JSON.stringify({source: source, target: target}), {search: params})
               .map(res => res.json());
  }

  private handleError(error: Response | any) {
    let errMsg: string;
    if (error instanceof Response) {
      errMsg = `${error.status} - ${error.statusText || ''} ${error.text()}`;
    } else {
      errMsg = error.message ? error.message : error.toString();
    }
    return Observable.throw({status: error.status, message: errMsg, rsp: error});
  }
}
