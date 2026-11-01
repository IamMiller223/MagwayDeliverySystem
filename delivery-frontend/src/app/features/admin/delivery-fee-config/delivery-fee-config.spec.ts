import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryFeeConfig } from './delivery-fee-config';

describe('DeliveryFeeConfig', () => {
  let component: DeliveryFeeConfig;
  let fixture: ComponentFixture<DeliveryFeeConfig>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryFeeConfig]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryFeeConfig);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
