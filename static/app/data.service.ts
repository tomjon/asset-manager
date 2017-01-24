import { Injectable } from '@angular/core';
import { Http, URLSearchParams, Headers, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Search } from './search';
import { Results } from './results';
import { Frequency } from './frequency';
import { User } from './user';

export var DATETIME_RE = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/;
export var DATE_RE = /^\d\d\d\d-\d\d-\d\d$/;

@Injectable()
export class DataService {
  constructor(private http: Http) { }

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
    return this.http.get(`/search${path}`, {search: params})
                    .map(res => {
                      let json = res.json();
                      let start = json.response.start;
                      let total = json.response.numFound;
                      let assets = this._datetime2dateArray(json.response.docs);
                      let facets = {};
                      if (json.facet_counts) {
                        for (let field in json.facet_counts.facet_fields) {
                          let values = json.facet_counts.facet_fields[field];
                          facets[field] = {};
                          for (let i: number = 0; i < values.length; i += 2) {
                            facets[field][values[i]] = values[i + 1];
                          }
                        }
                      }
                      return new Results(start, total, assets, facets);
                    })
                    .catch(this.handleError);
  }

  updateAsset(asset: any): Observable<void> {
    let headers = new Headers({'Content-Type': 'application/json'});
    let body = JSON.stringify(this._date2datetime(asset));
    return this.http.put(`/asset/${asset.id}`, body, {headers: headers})
                    .catch(this.handleError);
  }

  addAsset(asset: any): Observable<string> {
    let headers = new Headers({'Content-Type': 'application/json'});
    let body = JSON.stringify(this._date2datetime(asset));
    return this.http.post(`/asset`, body, {headers: headers})
                    .map(res => res.json().id)
                    .catch(this.handleError);
  }

  getAsset(id: string): Observable<any> {
    return this.http.get(`/asset/${id}`)
                    .map(res => {
                      let docs = res.json().response.docs;
                      let assets = this._datetime2dateArray(docs);
                      return assets.length > 0 ? assets[0] : {};
                    })
                    .catch(this.handleError);
  }

  deleteById(id: string): Observable<void> {
    return this.http.delete(`/asset/${id}`)
                    .catch(this.handleError);
  }

  deleteAttachment(asset: any, file_id: number): Observable<any[]> {
    return this.http.delete(`/file/${asset.id}/${file_id}`)
                    .map(res => res.json())
                    .catch(this.handleError);
  }

  uploadAttachment(asset: any, name: string, file: FileList): Observable<any[]> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('name', name);
    return this.http.post(`/file/${asset.id}`, file, {search: params})
                    .map(res => res.json())
                    .catch(this.handleError);
  }

  getAttachments(asset: any): Observable<any[]> {
    return this.http.get(`/file/${asset.id}`)
                    .map(res => res.json())
                    .catch(this.handleError);
  }

  getEnums(): Observable<any> {
    return this.http.get(`/enum`)
                    .map(res => res.json())
                    .catch(this.handleError);
  }

  addNewEnumLabel(field: string, label: any): Observable<any> {
    let headers: Headers = new Headers({'Content-Type': 'application/json'});
    let body = JSON.stringify(label);
    let params: URLSearchParams = new URLSearchParams();
    params.set('label', label);
    return this.http.post(`/enum/${field}`, body, {search: params, headers: headers})
                    .map(res => res.json())
                    .catch(this.handleError);
  }

  getCurrentUser(): Observable<User> {
    return this.http.get(`/user`)
                    .map(res => res.json())
                    .catch(this.handleError);
  }

  updateDetails(user: User): Observable<void> {
    let headers: Headers = new Headers({'Content-Type': 'application/json'});
    let body = JSON.stringify(user);
    return this.http.put(`/user`, body, {headers: headers})
                    .catch(this.handleError);
  }

  addUser(user: User): Observable<void> {
    let headers: Headers = new Headers({'Content-Type': 'application/json'});
    let body = JSON.stringify(user);
    return this.http.post(`/user/admin`, body, {headers: headers})
                    .catch(this.handleError);
  }

  login(username: string, password: string): Observable<User> {
    let headers: Headers = new Headers({'Content-Type': 'application/json'});
    let params: URLSearchParams = new URLSearchParams();
    params.set('username', username);
    let body = JSON.stringify({password: password});
    return this.http.post(`/login`, body, {search: params, headers: headers})
                    .map(res => res.json())
                    .catch(this.handleError);
  }

  logout(): Observable<void> {
    return this.http.get(`/logout`)
                    .catch(this.handleError);
  }

  getBookings(asset: any): Observable<any[]> {
    return this.http.get(`/booking/${asset.id}`)
                    .map(res => res.json())
                    .catch(this.handleError);
  }

  getBookingsForProject(project_id: string): Observable<any[]> {
    return this.http.get(`/project/${project_id}`)
                    .map(res => res.json())
                    .catch(this.handleError);
  }

  deleteBooking(booking: any): Observable<void> {
    return this.http.delete(`/booking/${booking.booking_id}`)
                    .catch(this.handleError);
  }

  addBooking(asset: any, project: any, dueOutDate: string, dueInDate: string, data: any): Observable<any> {
    let headers: Headers = new Headers({'Content-Type': 'application/json'});
    let params: URLSearchParams = new URLSearchParams();
    params.set('project', project);
    params.set('dueOutDate', dueOutDate);
    params.set('dueInDate', dueInDate);
    let body = JSON.stringify(data);
    return this.http.post(`/booking/${asset.id}`, body, {search:params, headers: headers})
                    .map(res => res.json())
                    .catch(this.handleError);
  }

  book(asset: any, out: boolean): Observable<void> {
    if (out) {
      return this.http.put(`/book/${asset.id}`, '')
                      .catch(this.handleError);
    } else {
      return this.http.delete(`/book/${asset.id}`)
                      .catch(this.handleError);
    }
  }

  private handleError(error: Response | any) {
    let errMsg: string;
    if (error instanceof Response) {
      const body = error.json() || '';
      const err = body.error || JSON.stringify(body);
      errMsg = `${error.status} - ${error.statusText || ''} ${err}`;
    } else {
      errMsg = error.message ? error.message : error.toString();
    }
    console.error(errMsg);
    return Observable.throw(errMsg);
  }
}
