import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute }   from '@angular/router';
import { QueryLibraryService }      from '../../../services/query-library.service';

@Component({
  selector: 'app-country',
  templateUrl: './country.component.html',
  styleUrls: ['./country.component.css']
})
export class CountryComponent implements OnInit {

  private params: object = {};

  constructor(private queryLibraryService: QueryLibraryService, private route:ActivatedRoute) {

    this.params = route.params['_value'];
    
  }

  ngOnInit() {
  }

}
