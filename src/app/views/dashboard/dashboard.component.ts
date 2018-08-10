import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  private projects:Array<object> = [
    { name: 'Project 1', label: 'PR1' },
    { name: 'Project 2', label: 'PR2' }
  ]

  constructor() { }

  ngOnInit() {
  }

}
