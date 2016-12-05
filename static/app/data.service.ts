import { Injectable } from '@angular/core';
import { Http, URLSearchParams } from '@angular/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class DataService {
  constructor(private http: Http) { }

  solr(textFilter: string): Observable<any[]> {
    let params: URLSearchParams = new URLSearchParams();
    params.set('q', textFilter);
    return this.http.get(`/solr`, { search: params })
                    .map(res => res.json().response.docs)
                    .catch(this.handleError);
  }

  private handleError(error: any, caught: Observable<any>): Observable<any> {
    console.log(`${error._body} - ${error.status} ${error.statusText}`);
    return Observable.create(observer => { observer.error() });
  }
}
