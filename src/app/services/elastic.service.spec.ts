import { TestBed, inject } from '@angular/core/testing';

import { ElasticService } from './elastic.service';

describe('ElasticService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ElasticService]
    });
  });

  // TODO: Spy or mock the elasticsearch client to enable proper testing

});
