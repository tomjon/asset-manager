import { Injectable } from '@angular/core';
import { Http, URLSearchParams, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Results } from './results';

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

  search(textFilter: string, start: number, rows: number): Observable<Results> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('q', textFilter);
    params.set('start', start.toString());
    params.set('rows', (rows + 1).toString());
    return this.http.get(`/search`, {search: params})
                    .map(res => {
                      let response = res.json().response;
                      let start = response.start;
                      let total = response.numFound;
                      let assets = this._datetime2dateArray(response.docs);
                      return new Results(start, total, assets);
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

  deleteById(id: string): Observable<void> {
    return this.http.delete(`/asset/${id}`)
                    .catch(this.handleError);
  }

  getEnums(): Observable<any> {
    return this.http.get(`/enums`)
                    .map(res => res.json())
                    .catch(this.handleError);
  }

  setEnum(field: string, value: any): Observable<void> {
    let headers = new Headers({'Content-Type': 'application/json'});
    let body = JSON.stringify(value);
    return this.http.put(`/enum/${field}`, body, {headers: headers})
                    .catch(this.handleError);
  }

  private handleError(error: any, caught: Observable<any>): Observable<any> {
    console.log(`${error._body} - ${error.status} ${error.statusText}`);
    return Observable.create(observer => { observer.error() });
  }
}
