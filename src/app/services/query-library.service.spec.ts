import { TestBed, inject, async } from '@angular/core/testing';

import { QueryLibraryService } from './query-library.service';
import { ElasticService } from './elastic.service';
import { FilterType, AggType, SearchMode } from '../classes/query';
import { Author } from '../classes/author';

describe('QueryLibraryService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        QueryLibraryService,
        {
          provide: ElasticService,
          useValue: jasmine.createSpyObj(
            'ElasticService',
            ['search', 'count', 'agg']
          )
        }
      ]
    });
  });

  it('should be created', () => {
    const queryLibrary = TestBed.get(QueryLibraryService);
    expect(queryLibrary).toBeTruthy();
  });

  it('should register a query', () => {
    const queryLibrary = TestBed.get(QueryLibraryService);
    const query = queryLibrary.register('test');
    expect(query).toBeTruthy();
    expect(queryLibrary.q['test']).toBe(query);
  })

  it('should unregister a query', () => {
    const queryLibrary = TestBed.get(QueryLibraryService);
    const query = queryLibrary.register('test');
    expect(queryLibrary.q['test']).toBe(query);
    queryLibrary.unregister('test');
    expect(queryLibrary.q['test']).toBeUndefined();
  })

  it('should list queries', () => {
    const queryLibrary = TestBed.get(QueryLibraryService);
    queryLibrary.unregister('test');
    expect(queryLibrary.list()).not.toContain('test');
    const query = queryLibrary.register('test');
    expect(queryLibrary.list()).toContain('test');
  })

  it('should filter by country (search)', async(() => {
    const queryLibrary = TestBed.get(QueryLibraryService);
    const elastic = TestBed.get(ElasticService);
    const query = queryLibrary.register('test');
    const result = {
      total: 1,
      authors: [new Author({id: 'foo', name: 'foo'})],
      next: null,
    };
    const promise = new Promise(() => result);

    elastic.search.and.returnValue(promise);
    query.filter(
      FilterType.Country,
      {'type': 'code', 'value': 'US'},
      SearchMode.Search
    );

    expect(query.r).toBe(promise);
    query.c.then((c) => expect(c).toBe(result.total));

    expect(query.query.query.boolean.filter).toContain({
      "term": {
        "latest_affiliation.country.code": 'US'
      }
    });
  }))

  // TODO: Fix aggregation queries
  // it('should aggregate by country', async(() => {
  //   const queryLibrary = TestBed.get(QueryLibraryService);
  //   const elastic = TestBed.get(ElasticService);
  //
  //   const query = queryLibrary.register('test');
  //
  //   const result = {
  //     'Country': [
  //       {'term': 'US', 'agg': 100},
  //       {'term': 'DE', 'agg': 50},
  //     ]
  //   };
  //   const promise = new Promise(() => result);
  //   elastic.agg.and.returnValue(promise);
  //
  //   query.aggregate(AggType.Country, true);
  //
  //   query.a.then((a) => expect(a).toEqual(result));
  //   expect(query.query.aggs[AggType.Country]).toEqual({
  //     "terms": {
  //       "field": "latest_affiliation.country.code",
  //       "size": 250
  //     }
  //   });
  // }))
  //
  // it('should aggregate by institution', async(() => {
  //   const queryLibrary = TestBed.get(QueryLibraryService);
  //   const elastic = TestBed.get(ElasticService);
  //
  //   const query = queryLibrary.register('test');
  //
  //   const elasticResult = {
  //     'Institution': [
  //       {'term': 'grid.34477.33', 'agg': 100},
  //       {'term': 'grid.25879.31', 'agg': 50},
  //     ]
  //   };
  //   const promise = new Promise(() => elasticResult);
  //   elastic.agg.and.returnValue(promise);
  //
  //   query.aggregate(AggType.Institution, true);
  //
  //   query.a.then((a) => expect(a).toEqual(elasticResult));
  //   expect(query.query.aggs[AggType.Institution]).toEqual({
  //     "terms": {
  //       "field": "latest_affiliation.institution.grid_id",
  //       "size": 100000
  //     }
  //   });
  // }))
  //
  // it('should aggregate by country and institution', async(() => {
  //   const queryLibrary = TestBed.get(QueryLibraryService);
  //   const elastic = TestBed.get(ElasticService);
  //
  //   const query = queryLibrary.register('test');
  //
  //   const elasticResult = {
  //     'CountryInst': [
  //       {
  //         term: 'US',
  //         agg: 1220770,
  //         'Institution': [
  //           {term: 'grid.34477.33', agg: 12004},
  //           {term: 'grid.25879.31', agg: 10493}
  //         ]
  //       },
  //       {
  //         term: 'CN',
  //         agg: 325978,
  //         'Institution': [
  //           {term: 'grid.9227.e', agg: 3501},
  //         ]
  //       },
  //     ]
  //   };
  //   const promise = new Promise(() => elasticResult);
  //   elastic.agg.and.returnValue(promise);
  //
  //   query.aggregate(AggType.CountryInst, true);
  //
  //   query.a.then((a) => expect(a).toEqual(elasticResult));  // TODO: Fix async assert
  //
  //   expect(query.query.aggs[AggType.CountryInst]).toEqual({
  //     "terms": {
  //       "field": "latest_affiliation.country.code",
  //       "size": 250  // Safe upper bound, the current country count is 230
  //     },
  //     "aggs": {
  //       [AggType.Institution]: {
  //         "terms": {
  //           "field": "latest_affiliation.institution.grid_id",
  //           "size": 100000,  // The current GRID upper bound is 88,629
  //         }
  //       }
  //     }
  //   }));
  // })

});
