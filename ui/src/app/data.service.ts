import { Injectable } from '@angular/core';
import { Http, URLSearchParams, Headers, Response, RequestOptionsArgs } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Search } from './search';
import { Results } from './results';
import { Frequency } from './frequency';
import { User } from './user';
import { Notification } from './notification';

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

  private get(path: string, args: RequestOptionsArgs={}): Observable<any> {
    args.headers = new Headers({'Content-Type': 'application/json'});
    args.withCredentials = true;
    return this.busy(this.http.get(`${this.base_url}/${path}`, args).catch(this.handleError));
  }

  private put(path: string, body: any, args: RequestOptionsArgs={}): Observable<any> {
    args.headers = new Headers({'Content-Type': 'application/json'});
    args.withCredentials = true;
    return this.busy(this.http.put(`${this.base_url}/${path}`, body, args).catch(this.handleError));
  }

  private delete(path: string, args: RequestOptionsArgs={}): Observable<any> {
    args.headers = new Headers({'Content-Type': 'application/json'});
    args.withCredentials = true;
    return this.busy(this.http.delete(`${this.base_url}/${path}`, args).catch(this.handleError));
  }

  private post(path: string, body: any, args: RequestOptionsArgs={}): Observable<any> {
    args.headers = new Headers({'Content-Type': 'application/json'});
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
                 return new Results(start, total, assets, facets, json['enums']);
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
                 let docs = res.json().response.docs;
                 let assets = this._datetime2dateArray(docs);
                 return assets.length > 0 ? assets[0] : {};
               });
  }

  deleteById(id: string): Observable<void> {
    return this.delete(`asset/${id}`);
  }

  loadAttachments(): Observable<any[]> {
    return this.get(`file`)
               .map(res => res.json());
  }

  deleteAttachment(attachment_id: number): Observable<void> {
    return this.delete(`file/${attachment_id}`);
  }

  uploadAttachment(name: string, file: FileList): Observable<any> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('name', name);
    return this.post(`file`, file, {search: params})
               .map(res => res.json());
  }

  getAttachments(asset: any): Observable<any[]> {
    return this.get(`attachment/${asset.id}`)
               .map(res => res.json());
  }

  addAssociation(asset: any, attachment_id: number): Observable<void> {
    return this.put(`attachment/${asset.id}/${attachment_id}`, null);
  }

  removeAssociation(asset: any, attachment_id: number): Observable<void> {
    return this.delete(`attachment/${asset.id}/${attachment_id}`);
  }

  getEnums(): Observable<any> {
    return this.get(`enum`)
               .map(res => res.json());
  }

  addNewEnumLabel(field: string, label: any): Observable<any> {
    let body = JSON.stringify(label);
    let params: URLSearchParams = new URLSearchParams();
    params.set('label', label);
    return this.post(`enum/${field}`, body, {search: params})
               .map(res => res.json());
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

  addUser(user: User): Observable<void> {
    return this.post(`user/admin`, JSON.stringify(user));
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

  getBookings(asset: any): Observable<any[]> {
    return this.get(`booking/${asset.id}`)
               .map(res => res.json());
  }

  getBookingsForProject(project_id: string): Observable<any[]> {
    return this.get(`project/${project_id}`)
               .map(res => res.json());
  }

  deleteBooking(booking: any): Observable<void> {
    return this.delete(`booking/${booking.booking_id}`);
  }

  addBooking(asset: any, project: any, dueOutDate: string, dueInDate: string): Observable<any> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('project', project);
    params.set('dueOutDate', dueOutDate);
    params.set('dueInDate', dueInDate);
    return this.post(`booking/${asset.id}`, null, {search:params})
               .map(res => res.json());
  }

  book(asset: any, out: boolean): Observable<void> {
    if (out) {
      return this.put(`book/${asset.id}`, null);
    } else {
      return this.delete(`book/${asset.id}`);
    }
  }

  getNotifications(): Observable<Notification[]> {
    return this.get(`notification`).map(res => res.json());
  }

  addNotification(notification: Notification): Observable<Notification> {
    return this.post(`notification`, JSON.stringify(notification));
  }

  updateNotification(notification: Notification): Observable<Notification> {
    return this.put(`notification/${notification.notification_id}`, JSON.stringify(notification));
  }

  deleteNotification(notification_id: string): Observable<void> {
    return this.delete(`notification/${notification_id}`);
  }

  private handleError(error: Response | any) {
    let errMsg: string;
    if (error instanceof Response) {
      errMsg = `${error.status} - ${error.statusText || ''} ${error.text()}`;
    } else {
      errMsg = error.message ? error.message : error.toString();
    }
    return Observable.throw({status: error.status, message: errMsg});
  }
}
