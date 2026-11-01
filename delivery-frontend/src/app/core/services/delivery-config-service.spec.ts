import { TestBed } from '@angular/core/testing';

import { DeliveryConfigService } from './delivery-config-service';

describe('DeliveryConfigService', () => {
  let service: DeliveryConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeliveryConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
