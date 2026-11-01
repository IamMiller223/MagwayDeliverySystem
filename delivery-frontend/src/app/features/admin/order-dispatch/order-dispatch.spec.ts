import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderDispatch } from './order-dispatch';

describe('OrderDispatch', () => {
  let component: OrderDispatch;
  let fixture: ComponentFixture<OrderDispatch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDispatch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderDispatch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
