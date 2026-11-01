import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { riderGuard } from './rider-guard';

describe('riderGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => riderGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
