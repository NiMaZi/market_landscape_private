import { NgModule }                 from '@angular/core';

import { AppMaterialModule }        from './app-material/app-material.module'
import { AppRoutingModule }         from './app-routing/app-routing.module';

import { BrowserModule }            from '@angular/platform-browser';
import { BrowserAnimationsModule }  from '@angular/platform-browser/animations';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { RouterModule, Routes }     from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {MatButtonModule, MatCheckboxModule, MatProgressSpinnerModule, MatCardModule, MatDividerModule, MatChipsModule, MatListModule, MatGridListModule, MatRadioModule} from '@angular/material';

import { LeafletModule }            from '@asymmetrik/ngx-leaflet';
import { LeafletMarkerClusterModule } from '@asymmetrik/ngx-leaflet-markercluster';

import { AppComponent }             from './app.component';

import { DashboardComponent }       from './views/dashboard/dashboard.component';
import { FilterBarComponent }       from './views/project/shared/filter-bar/filter-bar.component';

import { ExploreComponent }         from './views/project/explore/explore.component';
import { CountryComponent }         from './views/project/country/country.component';
import { InstitutionComponent }     from './views/project/institution/institution.component';

import { MapComponent }             from './views/project/shared/map/map.component';
import { SidebarComponent }       from './views/project/shared/sidebar/sidebar.component';


@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    FilterBarComponent,
    ExploreComponent,
    CountryComponent,
    InstitutionComponent,
    MapComponent,
    SidebarComponent,
  ],
  imports: [
    AppMaterialModule,
    AppRoutingModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule,
    MatListModule,
    MatGridListModule,
    MatRadioModule,
    BrowserModule,
    BrowserAnimationsModule,
    FlexLayoutModule,
    FormsModule,
    ReactiveFormsModule,
    LeafletModule.forRoot(),
    LeafletMarkerClusterModule.forRoot(),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
