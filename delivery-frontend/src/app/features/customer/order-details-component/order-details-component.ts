import {Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {OrderDetails, OrderService} from '../../../core/services/order-service';
import {DecimalPipe, NgClass, UpperCasePipe} from '@angular/common';
import { Location } from '@angular/common';

import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-order-details-component',
  imports: [
    UpperCasePipe,
    DecimalPipe,
    NgClass
  ],
  templateUrl: './order-details-component.html',
  styleUrl: './order-details-component.css',
})
export class OrderDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private location = inject(Location);

  orderDetails = signal<OrderDetails | null>(null);
  isLoading = signal<boolean>(true);

  ngOnInit() {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.fetchDetails(orderId);
    }
  }

  fetchDetails(orderId: string) {
    this.orderService.getOrderDetails(orderId).subscribe({
      next: (response) => {
        this.orderDetails.set(response.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load order details', err);
        this.isLoading.set(false);
      }
    });
  }

  goBack() {
    this.location.back();
  }

  getStatusClass(status: string | undefined): string {
    switch(status?.toUpperCase()) {
      case 'PENDING': return 'status-pending';
      case 'PREPARING': return 'status-preparing';
      case 'DELIVERED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-pending';
    }
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return 'assets/placeholder-food.jpg';

    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    return `${environment.serverUrl}/images/${imagePath}`;
  }
}
