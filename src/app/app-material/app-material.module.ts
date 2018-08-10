import { NgModule } from '@angular/core';
import {
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatProgressSpinnerModule,
  MatTooltipModule,
  MatSelectModule,
  MatAutocompleteModule,
  MatOptionModule,
} from '@angular/material';

import {MatTabsModule} from '@angular/material/tabs';
import {MatToolbarModule} from '@angular/material/toolbar';

const modules = [
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatProgressSpinnerModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
  MatSelectModule,
  MatAutocompleteModule,
  MatOptionModule,  
]

@NgModule({
  imports: [...modules],
  exports: [...modules],
})
export class AppMaterialModule { }
