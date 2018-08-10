import { Injectable } from '@angular/core';
import { ElasticService } from './elastic.service';
import { Query, SearchMode, FilterType, AggType } from '../classes/query';
import { Author } from '../classes/author';

import { Observable, Subject, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QueryLibraryService {

  private searchResults: BehaviorSubject<object> = new BehaviorSubject<object>({});
  searchResults$ = this.searchResults.asObservable();
  private aggResults: BehaviorSubject<object> = new BehaviorSubject<object>({});
  aggResults$ = this.aggResults.asObservable();

  q: { [k: string]: Query; } = {};

  private active: Array<string> = [];
  private orQuery: Query;
  private searchMode: SearchMode;

  constructor(private elasticService: ElasticService) {

    this.orQuery = new Query(elasticService);

    // Mock data
    // TODO: Remove

    this.q = {
      eeg: new Query(
        this.elasticService, {displayName: 'EEG', color: '#1abc9c'}),
      tuberculosis: new Query(
        this.elasticService, {displayName: 'Tuberculosis', color: '#2980b9'}),
      aids: new Query(
        this.elasticService, {displayName: 'AIDS', color: '#c0392b'}),
    }

    this.q.eeg.queryPaper({"match": {"papers.abstract": "EEG"}});
    this.q.tuberculosis.queryPaper(
      {"match": {"papers.abstract": "tuberculosis"}});
    this.q.aids.queryPaper({"match": {"papers.abstract": "aids"}});

    Object.keys(this.q).map(
      k => this.q[k].aggregate(AggType.CountryInst));

    this.active = ['eeg', 'aids', 'tuberculosis'];

    this.orQuery.or(this.active.map((k) => this.q[k]));

    // World
    // this.aggregate(AggType.CountryInst, true);
    // this.setSearchMode(SearchMode.Aggregate);

    // Country
    // this.filter(FilterType.Country, {});  // TODO
    // this.aggregate(AggType.Institution);
    // this.setSearchMode(SearchMode.Aggregate);

    // Institution
    // this.filter(FilterType.Institution, {});  // TODO
    // this.setSearchMode(SearchMode.Search);

    // this.update();
  }

  selectProject(projectId: String): void {
    // TODO
  }

  list(): string[] {
    return Object.keys(this.q);
  }

  register(queryId: string): Query {
    let newQuery = new Query(this.elasticService);
    this.q[queryId] = newQuery;
    return newQuery;
  }

  unregister(queryId: string) {
    if (queryId in this.q)
      delete this.q[queryId];
  }

  setSearchMode(searchMode: SearchMode) {
    this.searchMode = searchMode;
  }

  activate(queryId: string) {
    this.active.push(queryId);
    this.orQuery.or(this.active.map((k) => this.q[k]));
    this.orQuery.execute(this.searchMode);
    this.q[queryId].execute(this.searchMode);
    this.updateResults();
    return this.active;
  }

  deactivate(queryId: string) {
    let i = this.active.indexOf(queryId);
    this.active = this.active.splice(i, 1);
    this.orQuery.or(this.active.map((k) => this.q[k]));
    this.orQuery.execute(this.searchMode);
    this.updateResults();
    return this.active;
  }

  filter(filterType: FilterType, filter: any) {
    this.orQuery.filter(filterType, filter);
    this.active.map((k) => this.q[k].filter(filterType, filter));
  }

  aggregate(aggType: AggType) {
    this.orQuery.aggregate(aggType);
    this.active.map((k) => this.q[k].aggregate(aggType));
  }

  update() {
    if (this.active.length > 1) this.orQuery.execute(this.searchMode);
    this.active.map((k) => this.q[k].execute(this.searchMode));
    this.updateResults();
  }

  private async updateResults() {
    this.searchResults.next({
      metadata: this.active.map(k => this.q[k].metadata),
      segments: await Promise.all(
        this.active.map(async (k) => await this.q[k].r))
    });

    let orResult = null;
    if (this.active.length > 1) {
      orResult = await this.orQuery.a;
    } else if (this.active.length === 1) {
      orResult = await this.q[this.active[0]].a;
    }

    this.aggResults.next({
      metadata: this.active.map(k => this.q[k].metadata),
      or: orResult,
      segments: await Promise.all(
        this.active.map(async (k) => await this.q[k].a))
    });
  }
}
