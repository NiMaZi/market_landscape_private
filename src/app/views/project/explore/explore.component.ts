import { Component, OnInit }        from '@angular/core';
import { Router, ActivatedRoute }   from '@angular/router';


@Component({
  selector: 'app-explore',
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.css']
})
export class ExploreComponent implements OnInit {

  countryList = [
    { name: 'Germany', label:'DE' },
    { name: 'Netherlands', label: 'NL' },
    { name: 'India', label: 'IN' }
  ]

  constructor(private router: Router, private route:ActivatedRoute) { }

  ngOnInit() {
  }

  transition(label:string) {
    this.router.navigate([label], { relativeTo:this.route });
  }

}
