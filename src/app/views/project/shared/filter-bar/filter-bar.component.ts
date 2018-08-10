import { Component, OnInit, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { QueryLibraryService } from '../../../../services/query-library.service';
import { ElasticService } from '../../../../services/elastic.service';
import { SearchMode, FilterType, AggType } from '../../../../classes/query';

export enum Level {
  World = 'World',
  Country = 'Country',
  Institution = 'Institution'
}

@Component({
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.css']
})
export class FilterBarComponent implements OnInit {

  @Input() level: string;
  @Input() selection: string;

  countryQuery = new FormControl('');
  institutionQuery = new FormControl('');
  querySelection = new FormControl('');  // TODO: What type?
  textQuery = new FormControl('');
  minNpapers = new FormControl(0);
  minMatched = new FormControl(0);
  firstPaperDate = new FormControl('');
  minDate = new FormControl('');
  maxDate = new FormControl('');

  countryOptions: Observable<string[]>;
  countryNames: string[] = [];
  instOptions: Observable<string[]>;
  instNames: string[] = [];

  constructor(
    private queryLib: QueryLibraryService,
    private elastic: ElasticService
  ) { }

  ngOnInit() {
    // Autocomplete

    this.elastic.allCountries().then(countries => {
      this.countryNames = countries;
    });
    this.countryOptions = this.countryQuery.valueChanges.pipe(
      startWith(''),
      map(q => this.countryNames.filter(
          name => name.toLowerCase().includes(q.toLowerCase())
      ))
    );

    // this.elastic.allInstitutions().then(institutions => {
    //   console.log(institutions);
    //   this.instNames = institutions;
    // });
    this.instOptions = this.institutionQuery.valueChanges.pipe(
      startWith(''),
      map(q => this.instNames.filter(
          name => name.toLowerCase().includes(q.toLowerCase())
      ))
    );

    // Filter bar modes
    switch(this.level) {
      case Level.World:
        this.queryLib.aggregate(AggType.CountryInst);
        this.queryLib.setSearchMode(SearchMode.Aggregate);
        break;
      case Level.Country:
        this.queryLib.filter(
          FilterType.Country, {type: 'instCode', value: this.selection});
        this.queryLib.aggregate(AggType.Institution);
        this.queryLib.setSearchMode(SearchMode.Aggregate);
        break;
      case Level.Institution:
        this.queryLib.filter(
          FilterType.Institution, {type: 'grid', value: this.selection});
        this.queryLib.setSearchMode(SearchMode.Search);
        break;
      default:
        throw new Error('Invalid filter level: ' + this.level);
    }

    this.queryLib.update();
  }

  onSubmit() {
    console.log(this.countryQuery.value);
    let empty = true;

    if (this.countryQuery.value) {
      empty = false;
      this.queryLib.filter(
        FilterType.Country,
        {type: 'instName', value: this.countryQuery.value}
      );
    }

    if (this.institutionQuery.value) {
      empty = false;
      // this.queryLib.filter(
      //   FilterType.Institution,
      //   {
      //     type: 'grid',
      //     value: {
      //       institution: this.institutionQuery.value,
      //       countryCode: this.country,  // TODO: Optional
      //     }
      //   }
      // );
    }

    if (!empty) this.queryLib.update();
  }

}
