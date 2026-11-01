import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomersManagement } from './customers-management';

describe('CustomersManagement', () => {
  let component: CustomersManagement;
  let fixture: ComponentFixture<CustomersManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomersManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomersManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
