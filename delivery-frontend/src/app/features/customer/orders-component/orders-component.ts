import {Component, inject, signal} from '@angular/core';
import {Order, OrderService} from '../../../core/services/order-service';
import {AuthService} from '../../../core/services/AuthService';
import {Router} from '@angular/router';
import {DatePipe, DecimalPipe, NgClass, UpperCasePipe} from '@angular/common';

@Component({
  selector: 'app-orders-component',
  imports: [
    NgClass,
    DatePipe,
    UpperCasePipe,
    DecimalPipe
  ],
  templateUrl: './orders-component.html',
  styleUrl: './orders-component.css',
})
export class OrdersComponent {

  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private router = inject(Router);

  orders = signal<Order[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit() {

    const user = this.authService.currentUser();

    if (!user || !user.userId) {
      console.warn("Unauthorized access detected. Redirecting to login.");
      this.router.navigate(['/login']);
      return;
    }

    this.fetchOrders(user.userId);
  }

  fetchOrders(customerId: string) {
    this.orderService.getUserOrders(customerId)
      .subscribe({
        next: (response) => {
          const sortedOrders = response.data.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.orders.set(sortedOrders);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load orders', err);
          this.isLoading.set(false);
        }
      });
  }

  getStatusClass(status: string): string {
    switch(status?.toUpperCase()) {
      case 'PENDING': return 'status-pending';
      case 'PREPARING': return 'status-preparing';
      case 'DELIVERED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-pending';
    }
  }

  viewOrderDetails(orderId: string) {
    this.router.navigate(['/customer/orders', orderId]);
  }
}
