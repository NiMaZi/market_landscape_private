import { Injectable } from '@angular/core';

// TODO: Use proper angular version
// https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/browser-builds.html
import * as elasticsearch from 'elasticsearch-browser';

import { Author } from '../classes/author';

@Injectable({
  providedIn: 'root'
})
export class ElasticService {

  private es: elasticsearch.Client;

  private countryCache: string[];
  private institutionCache: string[];

  constructor() {
    this.es = new elasticsearch.Client({
      host: {
        host: 'elastic.scitodate.com',
        port: 9200,
      }
    });
  }

  async search(query: object, pageSize: number = 50):
    Promise<Author[]> {

    let authors = [];
    let nextFrom = 0;
    let lastPageSize;

    do {

      const result = await this.es.search({
        index: 'authors',
        body: {
          ...query,
          "size": pageSize,
          "from": nextFrom,
        },
      });

      nextFrom += pageSize;
      lastPageSize = result.hits.hits.length;

      for (let hit of result.hits.hits) {
        authors.push(new Author(hit));
      }

      break;  // TODO: Remove

    } while (lastPageSize);

    return authors;
  }

  async count(query: object): Promise<number> {
    const result = await this.es.count({
      index: 'authors',
      body: query,
    });
    return result.count;
  }

  async agg(query: object): Promise<object> {

    const result = await this.es.search({
      index: 'authors',
      body: {
        ...query,
        "size": 0,
      },
    });

    return this.parseAgg(result.aggregations);
  }

  private parseAgg(agg: object): object {
    let output = {};
    let excluded = ['key', 'doc_count'];
    for (let key in agg) {
      if (excluded.includes(key)) continue;
      let buckets = [];
      for (let b of agg[key].buckets || []) {
        let subAgg = this.parseAgg(b);
        let bucket: object = {term: b.key, agg: b.doc_count, ...subAgg};
        buckets.push(bucket);
      }
      output[key] = buckets;
    }
    return output;
  }

  async allCountries(): Promise<string[]> {
    if (this.countryCache) return this.countryCache;

    const result = await this.es.search({
      index: 'authors',
      body: {
        'aggs': {
          'countries': {
            "terms": {
              "field": "latest_affiliation.country.name",
              "size": 250  // Safe upper bound, the current country count is 230
            }
          }
        }
      }
    });

    this.countryCache =
      result['aggregations']['countries']['buckets'].map(b => b['key']);

    return this.countryCache;
  }

  async allInstitutions(country?: string): Promise<string[]> {
    if (this.institutionCache) return this.institutionCache;

    const result = await this.es.search({
      index: 'authors',
      body: {
        'query': {
          'bool': {
            'filter': country ? [{
              "term": {
                "latest_affiliation.institution.country.name":
                  country
              }
            }] : []
          }
        },
        'aggs': {
          'institutions': {
            "terms": {
              "field": "latest_affiliation.institution.name",
              "size": 100000,  // The current GRID upper bound is 88,629
            }
          }
        }
      }
    });

    this.institutionCache =
      result['aggregations']['institutions']['buckets'].map(b => b['key']);

    return this.institutionCache;
  }
}
