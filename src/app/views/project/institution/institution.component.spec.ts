import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAuthorViewComponent } from './project-author-view.component';

describe('ProjectMapComponent', () => {
  let component: ProjectAuthorViewComponent;
  let fixture: ComponentFixture<ProjectAuthorViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProjectAuthorViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectAuthorViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
