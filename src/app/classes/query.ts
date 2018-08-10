import { Author } from './author';
import { ElasticService } from '../services/elastic.service';
import * as GRIDCoords from '../../assets/GRIDCoords.json';
import * as GRIDNames from '../../assets/GRIDNames.json';


export enum FilterType {
  Country = 'Country',
  Institution = 'Institution'
}

export enum AggType {
  Country = 'Country',
  Institution = 'Institution',
  CountryInst = 'CountryInst'
}

export enum SearchMode {
  Search = 'Search',
  Aggregate = 'Aggregate',
}

export class Query {

  private filterState: object = {};
  private aggState: object = {};
  private externalOr: Query[] = [];
  private paperQuery: object;

  query: object;
  r: Promise<Author[]>;
  c: Promise<number>;
  a: Promise<object>;

  // metadata: object;

  constructor(
    private elasticService: ElasticService,
    public metadata: object = {}
  ) { }

  or(queries: Query[]) {
    this.externalOr = queries;
  }

  filter(filterType: FilterType, filter: any): Query {
    this.filterState['type'] = filterType;
    this.filterState['value'] = filter;
    return this;
  }

  aggregate(aggType: AggType): Query {
    this.aggState['type'] = aggType;
    return this;
  }

  queryPaper(query: object) {
    this.paperQuery = query;
  }

  execute(searchMode: SearchMode) {
    this.query = this.composeQuery();
    switch(searchMode) {
      case SearchMode.Search:
        this.r = this.elasticService.search(this.query);
        break;
      case SearchMode.Aggregate:
        this.a = this.postprocessAgg(this.elasticService.agg(this.query));
        break;
      default:
        throw new Error('Invalid search mode ' + searchMode);
    }
  }

  private async postprocessAgg(aggPromise: Promise<object>): Promise<object> {
    let agg = await aggPromise;
    for (let key in agg) agg[key] = this.addCoords(agg[key]);
    return agg
  }

  // TODO: This data should come from Elasticsearch
  // (GUIDO) Rename the function as it also adds names
  private addCoords(agg: object[]): object[] {
    const excluded = ['term', 'agg', 'data'];
    for (let b of agg) {
      b['data'] = {};
      if (b['term'].startsWith('grid')) {
        const coords = GRIDCoords[b['term']];
        if (coords) b['data']['coords'] = coords;

        const name = GRIDNames[b['term']];
        if (name) b['data']['name'] = name;
      }
      for (let key in b) {
        if (excluded.includes(key)) continue;
        if (b[key]) b[key] = this.addCoords(b[key]);
      }
    }
    return agg;
  }

  private composeQuery(): object {
    return {
      "query": {
        "bool": {
          "minimum_should_match": this.externalOr.length ? 1 : 0,
          "should": this.externalOr.map((q) => q.composeQuery()['query']),
          "must": [
            {
              "nested": {
                "path": "papers",
                "query": this.paperQuery ? this.paperQuery : {"match_all": {}},
                "inner_hits": {
                  "size": 0  // I just need the count for now
                }  // TODO: Narrow down
              }
            }
          ],
          "filter": []
            .concat(this.composeCountryFilter())
            .concat(this.composeInstitutionFilter())
        }
      },
      "aggs": {
        ...this.composeCountryAgg(),
        ...this.composeInstitutionAgg(),
        ...this.composeCountryInstAgg(),
      }
    }
  }

  private composeCountryFilter() {
    if (this.filterState['type'] !== FilterType.Country) return [];
    const countryFilter = this.filterState['value'];

    if (!countryFilter.value || typeof countryFilter.value !== 'string')
      throw new Error(
        'Invalid or missing country filter value: ' + countryFilter.value);

    switch (countryFilter.type) {
      case 'affstr':
        return [{
          "match_phrase": {
            "latest_affiliation.affiliation.affstr": countryFilter.value
          }
        }];
      case 'name':
        return [{
          "match_phrase": {
            "latest_affiliation.country.name": countryFilter.value
          }
        }];
      case 'code':
        return [{
          "term": {
            "latest_affiliation.country.code": countryFilter.value
          }
        }];
      case 'instCode':
        return [{
          "term": {
            "latest_affiliation.institution.country.code": countryFilter.value
          }
        }];
      case 'instName':
        return [{
          "term": {
            "latest_affiliation.institution.country.name": countryFilter.value
          }
        }];
      case 'affstr':
        return [{
          "match_phrase": {
            "latest_affiliation.institution.last_affstr": countryFilter.value
          }
        }];
      default:
        throw new Error('Invalid country filter type ' + countryFilter.type);
    }
  }

  private composeInstitutionFilter() {
    if (this.filterState['type'] !== FilterType.Institution) return [];
    const instFilter = this.filterState['value'];

    if (!instFilter.value || typeof instFilter.value !== 'string')
      throw new Error(
        'Invalid or missing country filter value: ' + instFilter.value);

    switch(instFilter.type) {
      case 'name':
        return [{
          "match_phrase": {
            "latest_affiliation.institution.name": instFilter.value
          }
        }]
      case 'grid':
        return [{
          "term": {
            "latest_affiliation.institution.grid_id": instFilter.value
          }
        }]
      default:
        throw new Error('Invalid institution filter type ' + instFilter.type);
    }
  }

  private composeCountryAgg() {
    const countryAgg: boolean = this.aggState['type'] === AggType.Country;
    return countryAgg ? {
      [AggType.Country]: {
        "terms": {
          "field": "latest_affiliation.country.code",
          "size": 250  // Safe upper bound, the current country count is 230
        }
      }
    } : {};
  }

  private composeInstitutionAgg() {
    const instAgg: boolean = this.aggState['type'] === AggType.Institution;
    return instAgg ? {
      [AggType.Institution]: {
        "terms": {
          "field": "latest_affiliation.institution.grid_id",
          "size": 100000,  // The current GRID upper bound is 88,629
        }
      }
    } : {};
  }

  private composeCountryInstAgg() {
    const countryInstAgg: boolean =
      this.aggState['type'] === AggType.CountryInst;
    return countryInstAgg ? {
      [AggType.CountryInst]: {
        "terms": {
          "field": "latest_affiliation.institution.country.code",
          "size": 250  // Safe upper bound, the current country count is 230
        },
        "aggs": {
          [AggType.Institution]: {
            "terms": {
              "field": "latest_affiliation.institution.grid_id",
              "size": 100000,  // The current GRID upper bound is 88,629
            }
          }
        }
      }
    } : {};
  }
}
