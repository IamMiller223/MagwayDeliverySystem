import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantList } from './restaurant-list';

describe('RestaurantList', () => {
  let component: RestaurantList;
  let fixture: ComponentFixture<RestaurantList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RestaurantList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
