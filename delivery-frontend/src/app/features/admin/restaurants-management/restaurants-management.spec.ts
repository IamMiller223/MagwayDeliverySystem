import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantsManagement } from './restaurants-management';

describe('RestaurantsManagement', () => {
  let component: RestaurantsManagement;
  let fixture: ComponentFixture<RestaurantsManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantsManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RestaurantsManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
