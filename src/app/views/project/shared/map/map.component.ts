import { Component, ElementRef,
  Input, OnInit, AfterViewInit }    from '@angular/core';

import { QueryLibraryService }      from '../../../../services/query-library.service';
import { AggType }                  from '../../../../classes/query';

import * as L                       from 'leaflet';
import * as LM                      from 'leaflet.markercluster';
import * as turf                    from '@turf/turf';

import { byAlpha2 }                 from 'iso-country-codes';

// import * as countries               from '../../../assets/geojson/countries.json';
// import * as countries               from '../../../assets/geojson/countries_full.json';
import * as countries               from '../../../../../assets/geojson/countries3.json';


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit {

  /**
   * The WorldComponent can be shown on its own or with other countries.
   * When it is shown alone it receives the aggregation for its country.
   * When it is shown with other countries, it will receive the aggregation
   * for all countries. This is so that a single global aggregation is executed
   * instead of one per country.
   */
  @Input() inWorldView: boolean;
  @Input() countryCode: string;

  private loading: boolean = true;

  private countryLayer: any;
  private countryName: string;
  private countryBbox: any;

  private clusterLayer: any;
  private aggregation: object = {};

  private aggSub: any;

  /*
   * Leaflet settings
   */
  cartoLayer = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    maxZoom: 18,
    minZoom: 2,
    // attribution: '&copy;<a href="https://carto.com/attribution">CARTO</a>',
  })

  options = {
    zoomControl: false,
  	zoom: 2,
    maxZoom: 18,
    minZoom: 2,
  	center: L.latLng(0, 0),
    attributionControl: false
  };

  layers = [
    this.cartoLayer
  ];

  constructor(
    private element: ElementRef,
    private queryLibraryService: QueryLibraryService) {
  }

  ngOnInit() {
    /*
     * The clusterlayer contains all individual points and clusters. This is where you draw
     * markers. The moment you add a marker to the map this clustermarker plugin may decide to cluster
     * the points and call the iconCreateFunction. This is based on distance apart between two points.
     *
     * This is a custom function which takes a cluster as input. In my case such a cluster consists
     * of the randomly generate points within the country bbox. However, this can also be piecharts.
     */

    this.clusterLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 20,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: false,
      spiderfyDistanceMultiplier: 1.5,
      iconCreateFunction: (cluster) => {
        /*
         * The iconCreateFunction is passed a cluster. This cluster contains points generated
         * in the mapReady fucntion. Each point get's passed a property color based on the random assignment
         * of a segment. The Hex code of the color is passed as an attribute for new clusters, with The
         * amount of times it appears as a value.
         *
         * This is stored in a htmlString which can be used for a divIcon with a class. This makes the DOM
         * elements easy to fetch later on, when actually drawing the cluster. The toal children count is
         * added to calculate the pie slices size.
         *
         * This function return a single point, with no markup. There is actually nothing visible on the map.
         * The map gets updated though the on 'moveend' event which runs renderClusters. This function actually
         * transforms the divIcon which is created here in to clusters.
         */

        let children = cluster.getAllChildMarkers();
        let segments = [];
        let institutions = []

        for (let i = 0; i < children.length; i++) {
          let prop = children[i]['options']['properties']

          institutions.push(prop);
          let seg = prop['segments'];
          for (let s in seg) {
            let segmentIndex = segments.map((segment) => {
              return segment['displayName'];
            }).indexOf(seg[s]['displayName']);

            if (segmentIndex == -1) {
              segments.push(seg[s]);
            } else {
              segments[segmentIndex]['count'] += seg[s]['count'];
            }
          }
        }

        let iconSize = 10 + (Math.floor(cluster.getChildCount() / 250) * 2);
        if (iconSize > 25) {
          iconSize = 25;
        }

        return L.divIcon({
          className: 'placeholder',
          iconSize: L.point(iconSize, iconSize),
          html: '<canvas ' +
            'segments=' + JSON.stringify(segments) +
          '></canvas>',
          // @ts-ignore
          institutions: institutions
        });
      }
    });

    this.clusterLayer.on('clustermouseover', function(a) {
      let children = a.layer.getAllChildMarkers();

      for (let i = 0; i < children.length; i++) {
        let marker = children[i];
        console.log(marker.options.properties);
      }
    });

    this.aggSub = this.queryLibraryService.aggResults$.subscribe((val) => {

      if (val && (Object.keys(val).length !== 0)) {
        let agg = JSON.parse(JSON.stringify(val));

        // If global aggregation, extract country aggregation
        if (this.inWorldView) {
          // TODO: Remove assumption
          if (agg['or'] && agg['or'][AggType.CountryInst]) {
            agg['or'] = agg['or'][AggType.CountryInst]
              .filter(r => r.term === this.countryCode)[0];
          }

          for (let i = 0; i < agg['segments'].length; i++) {
            if (agg['segments'][i][AggType.CountryInst]) {
              agg['segments'][i] = agg['segments'][i][AggType.CountryInst]
                .filter(r => r.term === this.countryCode)[0];
            }
          }
        }

        this.aggregation = agg;
        this.loading = false;
        this.updateMap(agg);
      }
    });
  }

  ngAfterViewInit() {

  }

  updateMap(agg: object) {
    this.clusterLayer.clearLayers();

    let institutions = this.indexInstitutions(agg);
    this.addInstitutionPlaceholders(institutions, agg['metadata']);

    let clusters = document.getElementsByTagName('canvas');

    for (let i = 0; i < clusters.length; i++) {
      let canvas = clusters[i];
      let children = 0
      let colors= [];
      let data = {};

      for (let j = 0; j < canvas.attributes.length; j++){
        var att = canvas.attributes[j];
        if (att.nodeName == 'segments') {
          let segments = JSON.parse(att.nodeValue);
          for (let s in segments) {
            children += segments[s].count;
            colors.push(segments[s].color);
            data[segments[s].displayName] = segments[s].count;
          }
        }
      }

      /*
       * This part of the code is a bit messy. You should perhaps write a function which can map
       * circle area's properly. A circle with a diam of 2 is not twice as big as a diam of 1. I couldn't
       * be bothered back then to implement proper surface calculation as it was not that relevant.
       */

      let diam = 15 + (Math.floor(children / 50) * 2);
      if (diam > 25) {
        diam = 25;
      }

      canvas.width = diam;
      canvas.height = diam;


      /*
       * Select the canvas for the specific cluster and definition of a draw function. This is basic
       * HTMl5 canvas stuff.
       */

      var ctx = canvas.getContext('2d');

      // @ts-ignore
      function drawPieSlice(ctx,centerX, centerY, radius, startAngle, endAngle, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(centerX,centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
      };

      /*
       * Definition of a piechar class (atleast should be) which has one single function
       * for drawing the pie chart. Each segment was defined as a color:amount key pair earlier
       * and will be iterated over in below. I changed the color sorting and no I believe the
       * color_index part might actually not be working properly. The order of the colors is sorted
       * but the object containing the values is not. The whole part seems redundant anyway, storing
       * it in two seperate variables with partial overlapping data.
       */

      var Piechart = function(options) {
        this.options = options;
        this.canvas = options.canvas;
        this.ctx = this.canvas.getContext("2d");
        this.colors = options.colors;

        this.draw = function(){
          var total_value = 0;
          var color_index = 0;
          for (var categ in this.options.data) {
            var val = this.options.data[categ];
            total_value += val;
          }

          var start_angle = 0;

          /*
           * For each segment, draw a slice.
           */

          for (categ in this.options.data){
            val = this.options.data[categ];
            var slice_angle = 2 * Math.PI * val / total_value;

            drawPieSlice(
              this.ctx,
              this.canvas.width/2,
              this.canvas.height/2,
              Math.min(this.canvas.width/2,this.canvas.height/2),
              start_angle,
              start_angle+slice_angle,
              this.colors[color_index%this.colors.length]
            );

            start_angle += slice_angle;
            color_index++;
          }
        }
      }

      /*
       * Actual creation of a new clusterPie for every cluster provided by the plugin.
       * Call the drawfunction to draw the slices.
       */

      var clusterPie = new Piechart(
        {
          canvas: canvas,
          data: data,
          colors: colors
        }
      );
      clusterPie.draw();
    }
  }

  private indexInstitutions(agg: object): object {
    let institutions = {};

    for (let r of agg['or'][AggType.Institution]) {
      if (!r['data'] || !r['data']['coords']) continue;
      institutions[r['term']] = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: r['data']['coords']
        },
        properties: {
          name: r['data']['name'],
          total: r['agg'],
          segments: [],
        }
      };
    }

    for (let i = 0; i < agg['segments'].length; i++) {
      for (let r of agg['segments'][i][AggType.Institution]) {
        // TODO: Make sure the OR query and the segments are synced
        if (!institutions[r['term']]) continue;

        institutions[r['term']]['properties']['segments'].push({
          displayName: agg['metadata'][i]['displayName'],
          count: r['agg'],
          color: agg['metadata'][i]['color']
        });
      }

    }

    return institutions;
  }

  private addInstitutionPlaceholders(institutions: object, metadata: object) {
    // Compute maximum for marker size for normalization
    let maxTotal = Object.keys(institutions)
      .map(key => institutions[key]['total'])
      .reduce((t1, t2) => Math.max(t1, t2), 0);

    // Add placeholders
    // The placeholders are invisible canvas objects with some data
    // The placeholders are then used as reference to draw pie charts
    for (let gridId in institutions) {
      let inst = institutions[gridId];
          inst['properties']['id'] = gridId;
      let size = this.scaleSize(inst['total'], maxTotal);

      let marker =  L.marker([inst['geometry']['coordinates'][0], inst['geometry']['coordinates'][1]],{
        icon: L.divIcon({
          className: 'placeholder',
          iconSize: L.point(size, size),
          html: '<canvas ' +
            'id=' + gridId + ' ' +
            'segments=' + JSON.stringify(inst['properties']['segments']) +
          '></canvas>'
        }),
        // @ts-ignore
        properties: inst['properties']
      });

      marker.on('mouseover', (e) => {
        console.log(inst['properties']);
      })

      this.clusterLayer.addLayer(marker);
    }
  }

  private scaleSize(score, maxScore) {
    // TODO: Tune
    // TODO: Convert to correct area scaling
    let minSize = 4;
    let maxSize = 100;
    return  ((maxSize - minSize) * score / maxScore) + minSize;
  }

  mapReady(map: L.Map) {
    /*
     * Use a timeout to update the map on the next cycle. Variable height due to Flex usage
     */
    setTimeout(()=>{
      map.invalidateSize();
      /*
       * Disable all map interactions
       */
      map.dragging.enable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.enable();
      map.boxZoom.disable();
      map.keyboard.disable();

      let iso3 = byAlpha2[this.countryCode].alpha3;
      let geojson = countries['features'].filter(
        feature => feature.properties.iso_a3 === iso3
      )[0];

      let style:any = {
        'color': '#ff292d',
        'weight': 0.5,
        'opacity': 1,
        'fillColor': '#bdc3c7',
        'fillOpacity': 0.5
      };

      this.countryBbox = turf.bbox(geojson);
      this.countryName = geojson.properties.admin;
      this.countryLayer = L.geoJSON(geojson, {
        style: style
      });

      map.fitBounds(this.countryLayer.getBounds());

      this.clusterLayer.addTo(map);

      map.on('moveend', ()=> {
        if (this.aggregation && (Object.keys(this.aggregation).length !== 0)) {
          this.updateMap(this.aggregation);
        }
      });
    });
  }

  ngOnDestroy() {
    this.aggSub.unsubscribe();
  }
}
