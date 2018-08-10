import { Component, Input, Output, ElementRef, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { QueryLibraryService }      from '../../../../services/query-library.service';
import { AuthorSelectService }      from '../../../../services/author-select.service';

import * as d3                      from 'd3';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {

  @Input() viewControl;
  private selectedAuthor: any = null;
  private status: any = "loading";
  private authors: any = [];
  private institutions: any = [];
  private aggregates: any = [];
  private metas: any = [];
  private numAuthors: any = 0;
  private authorDetails: any = {};
  private authorSegNum: any = {};
  private instSegNum: any = {};
  private authorScorePaper: any = {};
  private authorScorePaperMatched: any = {};
  private authorNames: any = {};
  private querySubInst: any;
  private querySubCtry: any;
  private authorSub: any;

  constructor(private router: Router, private queryLibraryService:QueryLibraryService, private authorSelectService:AuthorSelectService) {
    this.querySubInst = this.queryLibraryService.searchResults$.subscribe((val) => {
      if (val && (Object.keys(val).length !== 0)) {
        this.authors = val['segments'];
        this.metas = val['metadata'];
        this.status = "overview";
        this.selectedAuthor = null
        if (this.authors[0] !== undefined) {
          this.dataInitAuthor();
        }
        this.authorSelectService.setState(this.status,this.selectedAuthor);
      }
    });
    this.querySubCtry = this.queryLibraryService.aggResults$.subscribe((val) => {
      if (val && (Object.keys(val).length !== 0)) {
        this.institutions = val['segments'];
        this.metas = val['metadata'];
        this.aggregates = val['or'];
        this.status = "overview";
        this.selectedAuthor = null;
        if (this.aggregates !== undefined) {
          this.dataInitInst();
        }
        this.authorSelectService.setState(this.status,this.selectedAuthor);
      }
    });
    this.authorSub = this.authorSelectService.message$.subscribe((val) => {
      this.status = val['status'];
      this.selectedAuthor = val['selectedAuthor'];
      if (this.status === "selected") {
        this.drawBar();
      } else {
        if (this.viewControl === "institution") {
          this.drawAuthorBars(10,"matched");
        } else if (this.viewControl === "country") {
          this.drawCountryBars(10);
        }
      }
    });
  }

  ngOnInit() {
  }

  goBack(){
    this.status = "overview";
    this.selectedAuthor = null;
    this.authorSelectService.setState(this.status,this.selectedAuthor);
  }

  goToInst(instid:any){
    this.router.navigateByUrl(this.router.url + "/" + instid);
  }

  selectBar(): (d,i) => void{
    return (d,i) => {
      let id = String(d[0]);
      this.status = "selected";
      this.selectedAuthor = this.authorDetails[id];
      this.authorSelectService.setState(this.status,this.selectedAuthor);
    }
  }

  selectInst(): (d,i) => void{
    return (d,i) => {
      let instid = d[1][d[1].length-1];
      this.goToInst(instid);
    }
  }

  getRadioChange(event) {
    if (event.value === "pop"){
      this.drawAuthorBars(10,"popularity");
    } else {
      this.drawAuthorBars(10,"matched");
    }
  }

  drawCountryBars(anum:any) {
    let containerWidth = document.getElementById("bar-container").offsetWidth;
    let containerHeight = document.getElementById("bar-container").offsetHeight;

    let barWidth = 0.75 * containerWidth;
    let barHeight = 14;
    let y_padding = 2.5;

    if (this.aggregates.length === 0) {
      return;
    }

    let authorSorted = [];

    for (let key in this.instSegNum) {
      let total = 0;
      for (let i = 0; i < this.metas.length; i++){
        total += this.instSegNum[key][i];
      }
      let barData = [];
      let start = 0;
      for (let i = 0; i < this.metas.length; i++){
        barData.push({
          seg: i,
          length: this.instSegNum[key][this.metas.length],
          x: start,
          width: this.instSegNum[key][i] / total,
          fill: this.metas[i].color, 
        });
        start += this.instSegNum[key][i] / total;
      }
      authorSorted.push([key,this.instSegNum[key],barData]);
    }

    if (authorSorted.length === 0) {
      return;
    }

    let maxN = Math.max.apply(Math, authorSorted.map(function(v) {
      return v[1][v[1].length-2];
    }));

    authorSorted.sort(function(a,b){
      return b[1][b[1].length-2] - a[1][a[1].length-2];
    });

    let legendData = [];
    for (let i = 0; i < this.institutions.length; i++){
      legendData.push([this.institutions[i]['Institution'].length,this.metas[i].displayName,this.metas[i].color])
    }

    let maxL = Math.max.apply(Math, legendData.map(function(v) {
      return v[0];
    }));

    d3.select("#legend-container").selectAll('svg').remove();
    d3.select("#bar-container").selectAll('svg').remove();

    let legendSvg = d3.select("#legend-container").append('svg').attr("x",0).attr("y",0).attr("height",(barHeight + y_padding) * legendData.length * 2).attr("width",containerWidth);
    let legends = legendSvg.selectAll('rect').data(legendData).enter().append('rect')
                  .attr("x",0)
                  .attr("y",function(d,i){
                    return (2 * i + 1) * (barHeight + y_padding);
                  })
                  .attr("width",function(d){
                    return (d[0] / maxL) * barWidth;
                  })
                  .attr("height",barHeight)
                  .attr("fill",function(d){
                    return d[2];
                  })
    let legendText = legendSvg.selectAll('text').data(legendData).enter();
    legendText.append('text')
              .attr("x",0)
              .attr("y",function(d,i){
                return 2*i * (barHeight + y_padding) + barHeight;
              })
              .attr("font-size",barHeight)
              .attr("text-anchor","start")
              .text(function(d){
                return d[1];
              });
    legendText.append('text')
              .attr("x",function(d){
                return (d[0] / maxL) * barWidth;
              })
              .attr("y",function(d,i){
                return (2*i+1) * (barHeight + y_padding) + barHeight;
              })
              .attr("font-size",barHeight)
              .text(function(d){
                return String(d[0]);
              });

    let svg = d3.select("#bar-container").append('svg').attr("x",0).attr("y",0).attr("height",(barHeight + y_padding) * anum * 2).attr("width",containerWidth);

    let stack = svg.selectAll('g').data(authorSorted.slice(0,anum)).enter().append('g')
                .attr("transform",function(d,i){
                  return "translate(0," + ((2 * i + 1) * (barHeight + y_padding)) + ")";
                })
                .on("click",this.selectInst());

    let stackedBar = stack.selectAll('rect').data(function(d){
                return d[2]
              }).enter().append('rect')
              .attr("x",function(d){
                return d.x * barWidth * (d.length / maxN);
              })
              .attr("y",0)
              .attr("width",function(d){
                return d.width * barWidth * (d.length / maxN);
              })
              .attr("height",barHeight)
              .attr("fill",function(d){
                return d.fill;
              });
    let texts = svg.selectAll('text').data(authorSorted.slice(0,anum)).enter();
    texts.append('text')
              .attr("x",0)
              .attr("y",function(d,i){
                return 2*i * (barHeight + y_padding) + barHeight;
              })
              .attr("font-size",barHeight)
              .attr("text-anchor","start")
              .text(function(d){
                return String(d[0]);
              });
    texts.append('text')
              .attr("x",function(d){
                return (d[1][d[1].length-2] / maxN) * barWidth;
              })
              .attr("y",function(d,i){
                return (2*i+1) * (barHeight + y_padding) + barHeight;
              })
              .attr("font-size",barHeight)
              .text(function(d){
                return String(d[1][d[1].length-2]);
              });
  }

  /* draw (stacked) bars for top [anum] authors with D3.js */
  drawAuthorBars(anum:any,option:any) {

    /* set the size of the bar */
    let containerWidth = document.getElementById("bar-container").offsetWidth;
    let containerHeight = document.getElementById("bar-container").offsetHeight;

    let barWidth = 0.75 * containerWidth;
    let barHeight = 14;
    let y_padding = 2.5;

    let authorSorted = [];
    for (let key in this.authorScorePaper) {
      let total = 0;

      for (let i = 0; i < this.authorSegNum[key].length; i++) {
        total += this.authorSegNum[key][i];
      }

      let barData = [];
      let start = 0;

      for (let i = 0; i < this.authorSegNum[key].length; i++) {
        barData.push({
          length: this.authorScorePaper[key],
          x: start,
          width: (this.authorSegNum[key][i] / this.authorScorePaper[key]),
          fill: this.metas[i].color,
          num: this.authorSegNum[key][i],
        });
        start += this.authorSegNum[key][i] / this.authorScorePaper[key];
      }

      barData.push({
          length: this.authorScorePaper[key],
          x: start,
          width: ((this.authorScorePaper[key] - total) / this.authorScorePaper[key]),
          fill: "#dbdbdb",
          num: this.authorScorePaper[key] - total,
      });

      authorSorted.push([key,this.authorScorePaper[key],this.authorScorePaperMatched[key],this.authorNames[key],barData]);
    }

    let maxN = Math.max.apply(Math, authorSorted.map(function(v) {
      return v[1];
    }));

    let maxNM = Math.max.apply(Math, authorSorted.map(function(v) {
      return v[2];
    }));

    let maxNL = Math.max.apply(Math, authorSorted.map(function(v) {
      return v[3].length - 1;
    }));

    if (option === "matched") {
      authorSorted.sort(function(a,b){
        return b[2] - a[2];
      });
    } else {
      authorSorted.sort(function(a,b){
        return b[1] - a[1];
      });
    }

    let legendData = [];
    for (let i = 0; i < this.authors.length; i++){
      legendData.push([this.authors[i].length,this.metas[i].displayName,this.metas[i].color])
    }

    let maxL = Math.max.apply(Math, legendData.map(function(v) {
      return v[0];
    }));

    d3.select("#legend-container").selectAll('svg').remove();
    d3.select("#bar-container").selectAll('svg').remove();

    let legendSvg = d3.select("#legend-container").append('svg').attr("x",0).attr("y",0).attr("height",(barHeight + y_padding) * legendData.length * 2).attr("width",containerWidth);
    let legends = legendSvg.selectAll('rect').data(legendData).enter().append('rect')
                  .attr("x",0)
                  .attr("y",function(d,i){
                    return (2 * i + 1) * (barHeight + y_padding);
                  })
                  .attr("width",function(d){
                    return (d[0] / maxL) * barWidth;
                  })
                  .attr("height",barHeight)
                  .attr("fill",function(d){
                    return d[2];
                  })
    let legendText = legendSvg.selectAll('text').data(legendData).enter();
    legendText.append('text')
              .attr("x",0)
              .attr("y",function(d,i){
                return 2*i * (barHeight + y_padding) + barHeight;
              })
              .attr("font-size",barHeight)
              .attr("text-anchor","start")
              .text(function(d){
                return d[1];
              });
    legendText.append('text')
              .attr("x",function(d){
                return (d[0] / maxL) * barWidth;
              })
              .attr("y",function(d,i){
                return (2*i+1) * (barHeight + y_padding) + barHeight;
              })
              .attr("font-size",barHeight)
              .text(function(d){
                return String(d[0]);
              });

    let svg = d3.select("#bar-container").append('svg').attr("x",0).attr("y",0).attr("height",(barHeight + y_padding) * anum * 2).attr("width",containerWidth);
    let stack = svg.selectAll('g').data(authorSorted.slice(0,anum)).enter().append('g')
                .attr("transform",function(d,i){
                  return "translate(0," + ((2 * i + 1) * (barHeight + y_padding)) + ")";
                })
                .on("click",this.selectBar());
    let stackedBar = stack.selectAll('rect').data(function(d){
                     return d[4];
              }).enter().append('rect')
              .attr("x",function(d){
                return d.x * (d.length / maxN) * barWidth;
              })
              .attr("y",0)
              .attr("width",function(d){
                return d.width * (d.length / maxN) * barWidth;
              })
              .attr("height",barHeight)
              .attr("fill",function(d){
                return d.fill;
              });
    let texts = svg.selectAll('text').data(authorSorted.slice(0,anum)).enter();
    texts.append('text')
              .attr("x",0)
              .attr("y",function(d,i){
                return 2*i * (barHeight + y_padding) + barHeight;
              })
              .attr("font-size",barHeight)
              .attr("text-anchor","start")
              .text(function(d){
                return String(d[3]);
              });
    texts.append('text')
              .attr("x",function(d){
                return (d[1] / maxN) * barWidth;
              })
              .attr("y",function(d,i){
                return (2*i+1) * (barHeight + y_padding) + barHeight;
              })
              .attr("font-size",barHeight)
              .text(function(d){
                return String(d[1]);
              });
  }

  /* draw stacked bar for single author with D3.js */
  drawBar() {

    /* set the size of the bar */
    let containerWidth = document.getElementById("bar-container").offsetWidth;
    // let containerHeight = document.getElementById("bar-container").offsetHeight;
    let containerHeight = 14;

    /* don't change */
    let total = 0;
    for (let i = 0; i < this.authorSegNum[this.selectedAuthor.id].length; i++) {
      total += this.authorSegNum[this.selectedAuthor.id][i];
    }
    let barData = [];
    let start = 0;
    for (let i = 0; i < this.authorSegNum[this.selectedAuthor.id].length; i++) {
      barData.push({
        x: start * containerWidth,
        width: (this.authorSegNum[this.selectedAuthor.id][i] / total) * containerWidth,
        fill: this.metas[i].color,
        num: this.authorSegNum[this.selectedAuthor.id][i],
      });
      start += this.authorSegNum[this.selectedAuthor.id][i] / total;
    }

    d3.select("#legend-container").selectAll('svg').remove();
    d3.select("#bar-container").selectAll('svg').remove();
    let svg = d3.select("#bar-container").append('svg').attr("x",0).attr("y",0).attr("height",containerHeight).attr("width",containerWidth);
    let bar = svg.selectAll('rect').data(barData).enter().append('rect')
              .attr("x",function(d){
                return d.x;
              })
              .attr("y",0)
              .attr("width",function(d){
                return d.width;
              })
              .attr("height",containerHeight)
              .attr("fill",function(d){
                return d.fill;
              });
    let text = svg.selectAll('text').data(barData).enter().append('text')
              .attr("x",function(d){
                return d.x;
              })
              .attr("y",containerHeight)
              .attr("font-size",containerHeight)
              .text(function(d){
                if (d.num > 0) {
                  return String(d.num);
                } else {
                  return "";
                }
              });
  }

  dataInitAuthor() {
    let authorSeg = {};
    this.numAuthors = 0;
    this.authorDetails = {};
    this.authorSegNum = {};
    this.authorScorePaper = {};
    this.authorScorePaperMatched = {};

    for (let i = 0; i < this.authors.length; i++) {

        this.numAuthors += this.authors[i].length;

        for (let j = 0; j < this.authors[i].length; j++) {

          this.authorNames[this.authors[i][j].id] = this.authors[i][j].name;

          if (authorSeg[this.authors[i][j].id] === undefined) {
            authorSeg[this.authors[i][j].id] = {
              segment: i,
              score: this.authors[i][j].score,
            };
          } else {
            if (this.authors[i][j].score > authorSeg[this.authors[i][j].id].score) {
              authorSeg[this.authors[i][j].id] = {
                segment: i,
                score: this.authors[i][j].score,
              };
            }
          }

          if (this.authorSegNum[this.authors[i][j].id] === undefined) {
            this.authorSegNum[this.authors[i][j].id] = [];
            for (let k = 0; k < this.authors.length; k++) {
              this.authorSegNum[this.authors[i][j].id].push(0);
            }
          }

          if (this.authorScorePaper[this.authors[i][j].id] === undefined) {
            this.authorScorePaper[this.authors[i][j].id] = 0;
          }

          if (this.authorScorePaperMatched[this.authors[i][j].id] === undefined) {
            this.authorScorePaperMatched[this.authors[i][j].id] = 0;
          }

          this.authorSegNum[this.authors[i][j].id][i] += this.authors[i][j].npapersMatched;
          this.authorScorePaper[this.authors[i][j].id] += this.authors[i][j].npapers;
          this.authorScorePaperMatched[this.authors[i][j].id] += this.authors[i][j].npapersMatched;
        }
    }

    for (let i = 0; i < this.authors.length; i++){
      for (let j = 0; j < this.authors[i].length; j++){
        let authorDetail = {
            segment: authorSeg[this.authors[i][j].id].segment,
            score: authorSeg[this.authors[i][j].id].score,
            id: this.authors[i][j].id,
            name: this.authors[i][j].name,
            affstr: this.authors[i][j].latestAffstr || "UNKNOWN",
            keywords: this.authors[i][j].latestKeywords,
            papers: this.authors[i][j].latestPapers,
            npapers: this.authors[i][j].npapers,
            googlelink: "https://google.com/search?q=" + this.authors[i][j].name + "%20" + this.authors[i][j].latestAffstr,
            selected: false,
            hovered: false,
        }
        this.authorDetails[String(this.authors[i][j].id)] = authorDetail;
      }
    }
  }

  dataInitInst() {
    for (let i = 0; i < this.aggregates['Institution'].length; i++){
      let instSeg = [];
      for (let i = 0; i < this.metas.length; i++){
        instSeg.push(0);
      }
      instSeg.push(this.aggregates['Institution'][i]['agg']);
      instSeg.push(this.aggregates['Institution'][i]['term']);
      this.instSegNum[this.aggregates['Institution'][i]['data']['name']] = instSeg;
    }
    for (let i = 0; i < this.institutions.length; i++){
      for (let j = 0; j < this.institutions[i]['Institution'].length; j++){
        this.instSegNum[this.institutions[i]['Institution'][j]['data']['name']][i] += this.institutions[i]['Institution'][j]['agg'];
      }
    }
  }

  ngOnDestroy(){
    this.querySubInst.unsubscribe();
    this.querySubCtry.unsubscribe();
    this.authorSub.unsubscribe();
  }
}
