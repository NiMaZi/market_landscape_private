import { NgModule }                 from '@angular/core';
import { RouterModule, Routes }     from '@angular/router';

import { DashboardComponent }       from '../views/dashboard/dashboard.component';
import { ExploreComponent }         from '../views/project/explore/explore.component';
import { CountryComponent }         from '../views/project/country/country.component';
import { InstitutionComponent }     from '../views/project/institution/institution.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: ':projectid/explore', component: ExploreComponent },
  { path: ':projectid/explore/:countryid', component: CountryComponent },
  { path: ':projectid/explore/:countryid/:instid', component: InstitutionComponent },
  { path: 'projects/:projectid', redirectTo: '/projects/:projectid/explore', pathMatch: 'full' },

];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
