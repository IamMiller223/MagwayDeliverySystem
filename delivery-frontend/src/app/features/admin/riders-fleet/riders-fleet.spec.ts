import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RidersFleet } from './riders-fleet';

describe('RidersFleet', () => {
  let component: RidersFleet;
  let fixture: ComponentFixture<RidersFleet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RidersFleet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RidersFleet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
