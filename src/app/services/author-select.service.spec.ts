import { TestBed, inject } from '@angular/core/testing';

import { AuthorSelectService } from './author-select.service';

describe('ElasticService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthorSelectService]
    });
  });

  // TODO: Spy or mock the elasticsearch client to enable proper testing

});
