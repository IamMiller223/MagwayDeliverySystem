import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../../environments/environment';

export type OrderStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

// Existing Customer Order interface (preserved)
export interface Order {
  orderId: string;
  restaurantName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

// Admin Dashboard Table Summary interface
export interface OrderSummary {
  orderId: string;
  totalAmount: number;
  status: OrderStatus | string;
  customerName: string;
}

export interface OrderItemDetail {
  restaurantId: string;
  name: string;
  image: string;
  quantity: number;
  priceAtPurchase: number;
}

// Customer Order Details interface
export interface OrderDetails {
  orderId: string;
  riderId: string | null;
  status: string;
  totalAmount: number;
  deliveryAddress: string;
  items: OrderItemDetail[];
}

export interface AdminOrderCustomer {
  userId: string;
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
}

export interface AdminOrderRestaurant {
  restaurantId: string;
  name: string;
  phone: string;
  image: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface AdminOrderVehicle {
  id: string;
  riderId: string;
  type: string;
  licenceNumber: string;
  createdAt: string;
}

export interface AdminOrderRider {
  riderId: string;
  name: string;
  phone: string;
  email: string;
  image: string | null;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE' | string;
  nrcNumber: string;
  latitude: number | null;
  longitude: number | null;
  vehicle: AdminOrderVehicle | null;
}

export interface AdminOrderDetails {
  orderId: string;
  status: OrderStatus | string;
  totalAmount: number;
  deliveryAddress: string;
  shippingPhone: string;
  paymentImg: string;
  createdAt: string;
  customer: AdminOrderCustomer | null;
  restaurants: AdminOrderRestaurant[];
  rider: AdminOrderRider | null;
  items: OrderItemDetail[];
}

export interface NearestRider {
  riderId: string;
  name: string;
  phone: string;
  status: 'AVAILABLE' | string;
}

export interface OrderStatusUpdateResult {
  orderId: string;
  status: OrderStatus | string;
  riderId: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/orders`;

  // ==================== CUSTOMER OPERATIONS ====================

  getUserOrders(customerId: string): Observable<ApiResponse<Order[]>> {
    return this.http.get<ApiResponse<Order[]>>(`${this.baseUrl}/getUserOrders/${customerId}`);
  }

  getOrderDetails(orderId: string): Observable<ApiResponse<OrderDetails>> {
    return this.http.get<ApiResponse<OrderDetails>>(`${this.baseUrl}/getOrderDetails/${orderId}`);
  }

  // ==================== ADMIN OPERATIONS ====================

  /**
   * GET /api/orders?page=0&size=15
   * Optional date range: &from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  getOrders(
    page: number = 0,
    size: number = 15,
    from?: string,
    to?: string
  ): Observable<ApiResponse<OrderSummary[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (from && to) {
      params = params.set('from', from).set('to', to);
    }

    return this.http.get<ApiResponse<OrderSummary[]>>(this.baseUrl, { params });
  }

  /**
   * GET /api/orders/by-date?date=YYYY-MM-DD
   */
  getOrdersByDate(date: string): Observable<ApiResponse<OrderSummary[]>> {
    const params = new HttpParams().set('date', date);
    return this.http.get<ApiResponse<OrderSummary[]>>(`${this.baseUrl}/by-date`, { params });
  }

  /**
   * GET /api/orders/admin/order-details/{orderId}
   */
  getAdminOrderDetails(orderId: string): Observable<ApiResponse<AdminOrderDetails>> {
    return this.http.get<ApiResponse<AdminOrderDetails>>(
      `${this.baseUrl}/admin/order-details/${orderId}`
    );
  }

  /**
   * PUT Admin Accept Order
   */
  adminAcceptOrder(orderId: string): Observable<ApiResponse<OrderStatusUpdateResult>> {
    return this.http.put<ApiResponse<OrderStatusUpdateResult>>(
      `${this.baseUrl}/${orderId}/admin-accept`,
      {}
    );
  }

  /**
   * PUT Admin Reject Order
   */
  adminRejectOrder(orderId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${orderId}/admin-reject`, {});
  }

  /**
   * GET /api/orders/{orderId}/nearest-rider
   * Returns the single closest AVAILABLE rider computed by backend
   */
  getNearestRider(orderId: string): Observable<ApiResponse<NearestRider>> {
    return this.http.get<ApiResponse<NearestRider>>(
      `${this.baseUrl}/${orderId}/nearest-rider`
    );
  }

  /**
   * PUT /api/orders/{orderId}/assign/{riderId}
   * Transitions PREPARING -> OUT_FOR_DELIVERY
   */
  assignOrderToRider(
    orderId: string,
    riderId: string
  ): Observable<ApiResponse<OrderStatusUpdateResult>> {
    return this.http.put<ApiResponse<OrderStatusUpdateResult>>(
      `${this.baseUrl}/${orderId}/assign/${riderId}`,
      {}
    );
  }
}
