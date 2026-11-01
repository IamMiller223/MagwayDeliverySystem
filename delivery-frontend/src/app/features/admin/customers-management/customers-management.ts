import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { CustomerProfile, UserService } from '../../../core/services/user-service';
import {
  AdminOrderDetails,
  Order,
  OrderService,
  OrderStatus,
} from '../../../core/services/order-service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-customers-management',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, SlicePipe, UpperCasePipe],
  templateUrl: './customers-management.html',
  styleUrl: './customers-management.css',
})
export class CustomersManagement implements OnInit, OnDestroy {
  private userService = inject(UserService);
  private orderService = inject(OrderService);
  private router = inject(Router);

  // Master List State
  isLoadingCustomers = signal<boolean>(true);
  customers = signal<CustomerProfile[]>([]);
  contactFilter = signal<'ALL' | 'WITH_PHONE' | 'NO_PHONE'>('ALL');
  searchQuery = signal<string>('');

  // Selected Customer Profile & Order History State
  selectedUserId = signal<string | null>(null);
  isLoadingProfile = signal<boolean>(false);
  selectedCustomer = signal<CustomerProfile | null>(null);

  isLoadingOrders = signal<boolean>(false);
  customerOrders = signal<Order[]>([]);
  orderStatusFilter = signal<string>('ALL');

  // Slide-Over Order Details & Payment Proof Drawer State
  isDrawerOpen = signal<boolean>(false);
  isLoadingOrderDetails = signal<boolean>(false);
  isActionSubmitting = signal<boolean>(false);
  selectedOrderDetail = signal<AdminOrderDetails | null>(null);
  isPaymentZoomOpen = signal<boolean>(false);
  paymentImageError = signal<boolean>(false);

  readonly statusConfig: Record<string, { label: string; color: string; bgLight: string }> = {
    PENDING: { label: 'Pending', color: '#ea580c', bgLight: '#fff7ed' },
    PREPARING: { label: 'Preparing', color: '#2563eb', bgLight: '#eff6ff' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#7c3aed', bgLight: '#f5f3ff' },
    DELIVERED: { label: 'Delivered', color: '#059669', bgLight: '#ecfdf5' },
    CANCELLED: { label: 'Cancelled', color: '#dc2626', bgLight: '#fef2f2' },
  };

  private refreshListener = () => this.loadAllCustomers();

  // --- COMPUTED DIRECTORY FILTERS & METRICS ---

  withPhoneCount = computed(
    () => this.customers().filter((c) => !!c.phone && c.phone.trim().length > 0).length
  );

  noPhoneCount = computed(
    () => this.customers().filter((c) => !c.phone || c.phone.trim().length === 0).length
  );

  filteredCustomers = computed(() => {
    const filter = this.contactFilter();
    const q = this.searchQuery().trim().toLowerCase();

    return this.customers().filter((c) => {
      const hasPhone = !!c.phone && c.phone.trim().length > 0;
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'WITH_PHONE' && hasPhone) ||
        (filter === 'NO_PHONE' && !hasPhone);

      const matchesSearch =
        !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.userId && c.userId.toLowerCase().includes(q));

      return matchesFilter && matchesSearch;
    });
  });

  // --- SELECTED CUSTOMER ORDER METRICS ---

  filteredCustomerOrders = computed(() => {
    const status = this.orderStatusFilter();
    const list = this.customerOrders();
    if (status === 'ALL') return list;
    return list.filter((o) => o.status === status);
  });

  customerTotalSpent = computed(() =>
    this.customerOrders()
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  );

  customerDeliveredCount = computed(
    () => this.customerOrders().filter((o) => o.status === 'DELIVERED').length
  );

  customerActiveOrderCount = computed(
    () =>
      this.customerOrders().filter(
        (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
      ).length
  );

  // Drawer Financial Breakdown
  drawerFoodSubtotal = computed(() => {
    const detail = this.selectedOrderDetail();
    if (!detail?.items) return 0;
    return detail.items.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);
  });

  drawerDeliveryFee = computed(() => {
    const detail = this.selectedOrderDetail();
    if (!detail) return 0;
    return Math.max(0, detail.totalAmount - this.drawerFoodSubtotal());
  });

  ngOnInit() {
    this.loadAllCustomers();
    window.addEventListener('admin-manual-refresh', this.refreshListener);
  }

  ngOnDestroy() {
    window.removeEventListener('admin-manual-refresh', this.refreshListener);
  }

  // ==================== 1. CUSTOMER DIRECTORY & PROFILE ====================

  async loadAllCustomers() {
    this.isLoadingCustomers.set(true);
    try {
      const res = await lastValueFrom(this.userService.getAllCustomers());
      const list = res?.data || [];
      this.customers.set(list);

      if (!this.selectedUserId() && list.length > 0) {
        this.selectCustomer(list[0].userId);
      } else if (this.selectedUserId()) {
        this.selectCustomer(this.selectedUserId()!);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      this.isLoadingCustomers.set(false);
    }
  }

  async selectCustomer(userId: string) {
    this.selectedUserId.set(userId);
    this.orderStatusFilter.set('ALL');
    this.isLoadingProfile.set(true);
    this.isLoadingOrders.set(true);

    // Fetch single customer profile (/api/user/{id})
    try {
      const profileRes = await lastValueFrom(this.userService.getCustomerById(userId));
      if (profileRes?.data) {
        this.selectedCustomer.set(profileRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch customer profile:', err);
      const fallback = this.customers().find((c) => c.userId === userId) || null;
      this.selectedCustomer.set(fallback);
    } finally {
      this.isLoadingProfile.set(false);
    }

    // Fetch customer's order history (/api/orders/getUserOrders/{id})
    try {
      const ordersRes = await lastValueFrom(this.orderService.getUserOrders(userId));
      this.customerOrders.set(ordersRes?.data || []);
    } catch (err) {
      console.warn('Could not load customer orders:', err);
      this.customerOrders.set([]);
    } finally {
      this.isLoadingOrders.set(false);
    }
  }

  // ==================== 2. ORDER INSPECTION DRAWER ====================

  async openOrderDrawer(orderId: string) {
    this.selectedOrderDetail.set(null);
    this.paymentImageError.set(false);
    this.isPaymentZoomOpen.set(false);
    this.isDrawerOpen.set(true);
    this.isLoadingOrderDetails.set(true);

    try {
      const res = await lastValueFrom(this.orderService.getAdminOrderDetails(orderId));
      if (res?.data) {
        this.selectedOrderDetail.set(res.data);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      this.isLoadingOrderDetails.set(false);
    }
  }

  closeOrderDrawer() {
    this.isDrawerOpen.set(false);
    this.isPaymentZoomOpen.set(false);
    this.selectedOrderDetail.set(null);
  }

  openPaymentZoom() {
    if (!this.paymentImageError()) {
      this.isPaymentZoomOpen.set(true);
    }
  }

  closePaymentZoom() {
    this.isPaymentZoomOpen.set(false);
  }

  async handleAcceptOrder(orderId: string) {
    if (this.isActionSubmitting()) return;
    this.isActionSubmitting.set(true);

    try {
      await lastValueFrom(this.orderService.adminAcceptOrder(orderId));
      this.updateLocalOrderStatus(orderId, 'PREPARING');
      this.closeOrderDrawer();
      this.router.navigate(['/admin/orders', orderId, 'assign']);
    } catch (err) {
      console.error('Failed to accept order:', err);
      alert('Could not accept order.');
    } finally {
      this.isActionSubmitting.set(false);
    }
  }

  async handleRejectOrder(orderId: string) {
    if (this.isActionSubmitting()) return;
    if (!confirm('Are you sure you want to reject and cancel this order?')) return;

    this.isActionSubmitting.set(true);
    try {
      await lastValueFrom(this.orderService.adminRejectOrder(orderId));
      this.updateLocalOrderStatus(orderId, 'CANCELLED');
    } catch (err) {
      console.error('Failed to reject order:', err);
      alert('Could not reject order.');
    } finally {
      this.isActionSubmitting.set(false);
    }
  }

  goToAssignRiderPage(orderId: string) {
    this.closeOrderDrawer();
    this.router.navigate(['/admin/orders', orderId, 'assign']);
  }

  private updateLocalOrderStatus(orderId: string, newStatus: OrderStatus) {
    this.customerOrders.update((list) =>
      list.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o))
    );
    if (this.selectedOrderDetail()?.orderId === orderId) {
      this.selectedOrderDetail.update((d) => (d ? { ...d, status: newStatus } : null));
    }
  }

  resolveImageUrl(img?: string | null): string {
    if (!img) return '';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}/images/${img}`;
  }

  getGoogleMapsUrl(lat?: number, lon?: number): string {
    if (lat === undefined || lon === undefined) return '';
    return `https://www.google.com/maps?q=${lat},${lon}`;
  }
}
