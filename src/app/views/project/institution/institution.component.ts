import { Component, Input, Output, ElementRef, EventEmitter, OnInit } from '@angular/core';
import { ActivatedRoute }   from '@angular/router';
import { QueryLibraryService }      from '../../../services/query-library.service';
import { AuthorSelectService }      from '../../../services/author-select.service';

import * as cytoscape               from 'cytoscape';
import * as cyspringy               from 'cytoscape-springy';
import * as cypopper                from 'cytoscape-popper';
import * as d3                      from 'd3';

// declare var require: any

// const sigma = require('sigma'); (<any>window).sigma = sigma;
// require('../../../../node_modules/sigma/plugins/sigma.layout.noverlap/sigma.layout.noverlap.js');
// // require('../../../../node_modules/sigma/plugins/sigma.layout.forceAtlas2/tasks/forceAtlas2.js');
// // require('../../../../node_modules/sigma/plugins/sigma.layout.forceAtlas2/supervisor.js');
// // require('../../../../node_modules/sigma/plugins/sigma.layout.forceAtlas2/worker.js');
// require('../../../../node_modules/sigma/build/plugins/sigma.layout.forceAtlas2.min.js');
// require('../../../../node_modules/sigma/plugins/sigma.plugins.animate/sigma.plugins.animate.js');

@Component({
  selector: 'app-institution',
  templateUrl: './institution.component.html',
  styleUrls: ['./institution.component.css']
})
export class InstitutionComponent implements OnInit {

  private authors: any = [];
  private metas: any = [];
  private cy: any;
  private selectedAuthor:any = null;
  private status:any = "loading";
  private spinnerDiameter: any = 200;
  private numAuthors: any = 0;
  private renderedPositions: any = {};
  private querySub: any = {};
  private authorSub: any = {};
  private params: object = {};

  constructor(
    private queryLibraryService: QueryLibraryService,
    private authorSelectService: AuthorSelectService,
    private route: ActivatedRoute,
  ) {
    this.params = route.params['_value'];
    this.querySub = this.queryLibraryService.searchResults$.subscribe((val) => {
      if (val && (Object.keys(val).length !== 0)) {
        this.status = "overview";
        this.authors = val['segments'];
        this.metas = val['metadata'];
        for (let i = 0; i < this.authors.length; i++){
          this.numAuthors += this.authors[i].length;
        }
        this.drawGraph("new",this.selectedAuthor);
      }
    });
    this.authorSub = this.authorSelectService.message$.subscribe((val) => {
      this.status = val['status'];
      this.selectedAuthor = val['selectedAuthor'];
      if (this.status === "overview") {
        this.drawGraph("new",this.selectedAuthor);
      } else {
        let renderedPositions={};
        for (let i = 0; i < this.cy.nodes()['length']; i++){
              renderedPositions[this.cy.nodes()[i].data()['id']]={x:this.cy.nodes()[i].position('x'),y:this.cy.nodes()[i].position('y')};
        }
        this.renderedPositions = renderedPositions;
        this.drawGraph("saved",this.selectedAuthor.id);
      }
    });
  }

  ngOnInit() {
  }

  drawGraph(option:any,id:any) {
    this.cy = cytoscape({
            container: document.getElementById('graph-container'),
            elements: [],
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(name)',
                        'background-fit': 'contain',
                        'background-color': (ele) =>
                            ele.data('selected')?"#ffae0d":this.metas[ele.data('segment')].color,
                        'border-color': (ele) =>
                            ele.data('selected')?"#ffae0d":this.metas[ele.data('segment')].color,
                        'border-width': (ele) => ele.data('selected') ? 5 : 0,
                        'width': 'mapData(npapers, 0, 200, 10, 100)',
                        'height': 'mapData(npapers, 0, 200, 10, 100)',
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 1,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                    }
                }
            ]
        });

    this.cy.on('select', 'node', (event) => {
      this.status = "selected";
      this.selectedAuthor = event.target.data();
      this.authorSelectService.setState(this.status,this.selectedAuthor);
    }).on('mousemove', 'node', (event) => {
      let hovered = event.target.data()['id'];
      // TODO: tips?
    });

    let elems = [];
    let authorIndex = [];
    let authorSeg = {};

    for (let i = 0; i < this.authors.length; i++) {
        for (let j = 0; j < this.authors[i].length; j++) {

          authorIndex.push(this.authors[i][j].id);

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
        }
    }

    if (option === "new") {

      for (let i = 0; i < this.authors.length; i++) {
        for (let j = 0; j < this.authors[i].length; j++) {
          let node = {
          group: "nodes",
          data: {
            segment: authorSeg[this.authors[i][j].id].segment,
            score: authorSeg[this.authors[i][j].id].score,
            id: this.authors[i][j].id,
            name: this.authors[i][j].name,
            affstr: this.authors[i][j].latestAffstr || "UNKNOWN",
            keywords: this.authors[i][j].latestKeywords,
            papers: this.authors[i][j].latestPapers,
            npapers: this.authors[i][j].npapers,
            googlelink: "https://google.com/search?q=" + this.authors[i][j].name + "%20" + this.authors[i][j].latestAffstr,
            selected: (this.authors[i][j].id === id),
            hovered: false,
          },
          selected: false,
          selectable: true,
          grabbable: false,
          };
          elems.push(node);
        }
      }

      for (let i = 0; i < this.authors.length; i++){
        for (let j = 0; j < this.authors[i].length; j++){
          for (let k = 0; k < this.authors[i][j].coauthors.length; k++){
            if (authorIndex.includes(this.authors[i][j].coauthors[k])){
              let edge ={
                group: "edges",
                data: {
                  source: this.authors[i][j].id,
                  target: this.authors[i][j].coauthors[k],
                },
                selected: false,
                selectable: false,
                grabbable: false,
              };
              elems.push(edge);
            }
          }
        }
      }

      this.cy.elements().remove();
      this.cy.add(elems);

      cyspringy(cytoscape);
      this.cy.layout({
                  name: 'springy',
                  animate: true, // whether to show the layout as it's running
                  maxSimulationTime: 15000, // max length in ms to run the layout
                  fit: true, // whether to fit the viewport to the graph
                  padding: 30, // padding on fit
                  randomize: true, // whether to use random initial positions
                  infinite: false, // overrides all other options for a forces-all-the-time mode

                  // springy forces and config
                  stiffness: 15,
                  repulsion: 600,
                  damping: 0.5,
                  edgeLength: function( edge ){
                      var length = edge.data('length');
                      if( length !== undefined && !isNaN(length) ){
                        return length;
                      }
                  }
      }).run();

    } else {
      for (let i = 0; i < this.authors.length; i++) {
        for (let j = 0; j < this.authors[i].length; j++) {
          authorIndex.push(this.authors[i][j].id);
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
        }
      }

      for (let i = 0; i < this.authors.length; i++) {
        for (let j = 0; j < this.authors[i].length; j++) {
          let node = {
          group: "nodes",
          data: {
            segment: authorSeg[this.authors[i][j].id].segment,
            score: authorSeg[this.authors[i][j].id].score,
            id: this.authors[i][j].id,
            name: this.authors[i][j].name,
            affstr: this.authors[i][j].latestAffstr || "UNKNOWN",
            keywords: this.authors[i][j].latestKeywords,
            papers: this.authors[i][j].latestPapers,
            npapers: this.authors[i][j].npapers,
            googlelink: "https://google.com/search?q=" + this.authors[i][j].name + "%20" + this.authors[i][j].latestAffstr,
            selected: (this.authors[i][j].id === id),
          },
          position:{
                        x: this.renderedPositions[this.authors[i][j].id].x,
                        y: this.renderedPositions[this.authors[i][j].id].y,
                    },
          selected: false,
          selectable: true,
          grabbable: false,
          };
          elems.push(node);
        }
      }

      for (let i = 0; i < this.authors.length; i++){
        for (let j = 0; j < this.authors[i].length; j++){
          for (let k = 0; k < this.authors[i][j].coauthors.length; k++){
            if (authorIndex.includes(this.authors[i][j].coauthors[k])){
              let edge ={
                group: "edges",
                data: {
                  source: this.authors[i][j].id,
                  target: this.authors[i][j].coauthors[k],
                },
                selected: false,
                selectable: false,
                grabbable: false,
              };
              elems.push(edge);
            }
          }
        }
      }

      this.cy.elements().remove();
      this.cy.add(elems);
    }
  }

  // drawGraphWithSigma() {

  //   let S = new sigma({
  //     container: 'graph-container',
  //   });

  //   for (let i = 0; i < this.authors.features.length; i++) {
  //     S.graph.addNode({
  //       id: i,
  //       x: Math.random() * 100,
  //       y: Math.random() * 100,
  //       label: this.authors.features[i].properties.segment,
  //       color: "#ff0000",
  //       size: 10,
  //     });
  //   }

  //   for (let i = 0; i < 20; i++) {
  //     for (let j = 20; j < 40; j++) {
  //       S.graph.addEdge({
  //         id: i*100+j,
  //         source: i,
  //         target: j,
  //       });
  //     }
  //   }
  //   var noverlapListener = S.configNoverlap({
  //     nodeMargin: 3.0,
  //     scaleNodes: 1.3,
  //   });
  //   // Bind the events:
  //   noverlapListener.bind('start stop interpolate', function(e) {
  //     console.log(e.type);
  //     if(e.type === 'start') {
  //       // console.time('noverlap');
  //     }
  //     if(e.type === 'interpolate') {
  //       // console.timeEnd('noverlap');
  //     }
  //   });
  //   // Start the layout:
  //   // S.startNoverlap();
  //   S.startForceAtlas2({
  //     worker: false,
  //   });

  //   // S.refresh();
  // }

  ngOnDestroy() {
    this.querySub.unsubscribe();
    this.authorSub.unsubscribe();
  }

}
