import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import {
  AdminOrderDetails,
  OrderService,
  OrderStatus,
  OrderSummary,
} from '../../../core/services/order-service';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, SlicePipe, UpperCasePipe } from '@angular/common';
import {Router} from '@angular/router';

type FilterMode = 'ALL' | 'SINGLE_DATE' | 'DATE_RANGE';

interface StatusMetric {
  status: OrderStatus;
  label: string;
  count: number;
  percentage: number;
  revenue: number;
  color: string;
  bgLight: string;
  strokeDasharray: string;
  strokeDashoffset: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    FormsModule,
    SlicePipe,
    UpperCasePipe,
    DecimalPipe,
    DatePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  private router = inject(Router);

  // Loading & Table State
  isLoading = signal<boolean>(true);
  orders = signal<OrderSummary[]>([]);
  todayOrders = signal<OrderSummary[]>([]);

  // Pagination State (matches backend page=0&size=15)
  currentPage = signal<number>(0);
  pageSize = signal<number>(15);

  // Date & Status Filtering State
  filterMode = signal<FilterMode>('ALL');
  singleDate = signal<string>(this.formatDate(new Date()));
  fromDate = signal<string>('');
  toDate = signal<string>('');
  selectedStatusTab = signal<string>('ALL');
  searchQuery = signal<string>('');

  // Slide-Over Order Details, Payment Verification & Lightbox State
  isDrawerOpen = signal<boolean>(false);
  isLoadingDetails = signal<boolean>(false);
  isActionSubmitting = signal<boolean>(false);
  selectedOrderSummary = signal<OrderSummary | null>(null);
  selectedOrderDetail = signal<AdminOrderDetails | null>(null);
  isPaymentZoomOpen = signal<boolean>(false);
  paymentImageError = signal<boolean>(false);

  // Computed Breakdown for Selected Order in Drawer
  drawerFoodSubtotal = computed(() => {
    const detail = this.selectedOrderDetail();
    if (!detail || !detail.items) return 0;
    return detail.items.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);
  });

  drawerDeliveryFee = computed(() => {
    const detail = this.selectedOrderDetail();
    if (!detail) return 0;
    return Math.max(0, detail.totalAmount - this.drawerFoodSubtotal());
  });

  private refreshHandler = () => {
    this.loadTodaySnapshot();
    this.loadOrders();
  };

  readonly statusConfig: Record<string, { label: string; color: string; bgLight: string }> = {
    PENDING: { label: 'Pending', color: '#ea580c', bgLight: '#fff7ed' },
    PREPARING: { label: 'Preparing', color: '#2563eb', bgLight: '#eff6ff' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#7c3aed', bgLight: '#f5f3ff' },
    DELIVERED: { label: 'Delivered', color: '#059669', bgLight: '#ecfdf5' },
    CANCELLED: { label: 'Cancelled', color: '#dc2626', bgLight: '#fef2f2' },
  };

  readonly statusTabs = ['ALL', 'PENDING', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

  ngOnInit() {
    this.loadTodaySnapshot();
    this.loadOrders();
    window.addEventListener('admin-manual-refresh', this.refreshHandler);
  }

  ngOnDestroy() {
    window.removeEventListener('admin-manual-refresh', this.refreshHandler);
  }

  // --- API CALLS VIA ORDER SERVICE ---

  async loadTodaySnapshot() {
    try {
      const todayStr = this.formatDate(new Date());
      const res = await lastValueFrom(this.orderService.getOrdersByDate(todayStr));
      this.todayOrders.set(res?.data || []);
    } catch (err) {
      console.warn('Could not load today snapshot:', err);
    }
  }

  async loadOrders() {
    this.isLoading.set(true);
    try {
      const mode = this.filterMode();

      if (mode === 'SINGLE_DATE' && this.singleDate()) {
        const res = await lastValueFrom(this.orderService.getOrdersByDate(this.singleDate()));
        this.orders.set(res?.data || []);
      } else if (mode === 'DATE_RANGE' && this.fromDate() && this.toDate()) {
        const res = await lastValueFrom(
          this.orderService.getOrders(this.currentPage(), this.pageSize(), this.fromDate(), this.toDate())
        );
        this.orders.set(res?.data || []);
      } else {
        const res = await lastValueFrom(
          this.orderService.getOrders(this.currentPage(), this.pageSize())
        );
        this.orders.set(res?.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      this.orders.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- FILTER & PAGINATION CONTROLS ---

  applySingleDateFilter() {
    if (!this.singleDate()) return;
    this.filterMode.set('SINGLE_DATE');
    this.currentPage.set(0);
    this.loadOrders();
  }

  applyDateRangeFilter() {
    if (!this.fromDate() || !this.toDate()) return;
    this.filterMode.set('DATE_RANGE');
    this.currentPage.set(0);
    this.loadOrders();
  }

  applyQuickPreset(preset: 'TODAY' | 'LAST_7_DAYS' | 'ALL') {
    const today = new Date();
    if (preset === 'ALL') {
      this.filterMode.set('ALL');
      this.fromDate.set('');
      this.toDate.set('');
      this.currentPage.set(0);
      this.loadOrders();
    } else if (preset === 'TODAY') {
      this.singleDate.set(this.formatDate(today));
      this.filterMode.set('SINGLE_DATE');
      this.currentPage.set(0);
      this.loadOrders();
    } else if (preset === 'LAST_7_DAYS') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      this.fromDate.set(this.formatDate(past));
      this.toDate.set(this.formatDate(today));
      this.filterMode.set('DATE_RANGE');
      this.currentPage.set(0);
      this.loadOrders();
    }
  }

  nextPage() {
    if (this.orders().length < this.pageSize()) return;
    this.currentPage.update((p) => p + 1);
    this.loadOrders();
  }

  prevPage() {
    if (this.currentPage() === 0) return;
    this.currentPage.update((p) => p - 1);
    this.loadOrders();
  }

  // --- COMPUTED KPI & CHART ANALYTICS ---

  filteredOrders = computed(() => {
    const tab = this.selectedStatusTab();
    const q = this.searchQuery().trim().toLowerCase();

    return this.orders().filter((o) => {
      const matchesTab = tab === 'ALL' || o.status === tab;
      const matchesSearch =
        !q ||
        o.orderId.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  });

  totalViewRevenue = computed(() =>
    this.orders()
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((acc, o) => acc + (o.totalAmount || 0), 0)
  );

  deliveredRevenue = computed(() =>
    this.orders()
      .filter((o) => o.status === 'DELIVERED')
      .reduce((acc, o) => acc + (o.totalAmount || 0), 0)
  );

  pendingCount = computed(() =>
    this.orders().filter((o) => o.status === 'PENDING').length
  );

  todayOrderCount = computed(() => this.todayOrders().length);

  todayRevenue = computed(() =>
    this.todayOrders()
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((acc, o) => acc + (o.totalAmount || 0), 0)
  );

  // SVG Donut & Status Bar Chart Metrics
  statusMetrics = computed<StatusMetric[]>(() => {
    const list = this.orders();
    const total = list.length || 1;
    const statuses: OrderStatus[] = [
      'PENDING',
      'PREPARING',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ];

    let cumulativePercent = 0;
    const circumference = 2 * Math.PI * 40; // r=40 => ~251.32

    return statuses.map((st) => {
      const matching = list.filter((o) => o.status === st);
      const count = matching.length;
      const percentage = list.length > 0 ? Math.round((count / total) * 100) : 0;
      const revenue = matching.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const arcLength = (count / total) * circumference;
      const strokeDasharray = `${arcLength} ${circumference - arcLength}`;
      const strokeDashoffset = `${-cumulativePercent * circumference}`;
      cumulativePercent += count / total;

      const cfg = this.statusConfig[st] || {
        label: st,
        color: '#64748b',
        bgLight: '#f1f5f9',
      };

      return {
        status: st,
        label: cfg.label,
        count,
        percentage,
        revenue,
        color: cfg.color,
        bgLight: cfg.bgLight,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  });

  maxStatusRevenue = computed(() => {
    return Math.max(...this.statusMetrics().map((m) => m.revenue), 1);
  });

  // --- ORDER DETAILS & ACTION DRAWER ---

  async openOrderDrawer(order: OrderSummary) {
    this.selectedOrderSummary.set(order);
    this.selectedOrderDetail.set(null);
    this.paymentImageError.set(false);
    this.isPaymentZoomOpen.set(false);
    this.isDrawerOpen.set(true);
    this.isLoadingDetails.set(true);

    try {
      const res = await lastValueFrom(this.orderService.getAdminOrderDetails(order.orderId));
      if (res?.data) {
        this.selectedOrderDetail.set(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin order details:', err);
    } finally {
      this.isLoadingDetails.set(false);
    }
  }

  closeOrderDrawer() {
    this.isDrawerOpen.set(false);
    this.isPaymentZoomOpen.set(false);
    this.selectedOrderSummary.set(null);
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

      // Redirect to the dedicated Closest Rider Assignment page
      this.router.navigate(['/admin/orders', orderId, 'assign']);
    } catch (err) {
      console.error('Failed to accept order:', err);
      alert('Could not accept order. Please try again.');
    } finally {
      this.isActionSubmitting.set(false);
    }
  }

  goToAssignRiderPage(orderId: string) {
    this.closeOrderDrawer();
    this.router.navigate(['/admin/orders', orderId, 'assign']);
  }

  async handleRejectOrder(orderId: string) {
    if (this.isActionSubmitting()) return;

    // Safety check so admins don't accidentally click it
    if (!confirm('Are you sure you want to reject this order? The customer will be notified.')) return;

    this.isActionSubmitting.set(true);
    try {
      // 1. Call the updated service endpoint
      await lastValueFrom(this.orderService.adminRejectOrder(orderId));

      // 2. Instantly update the UI status to CANCELLED without needing a page reload
      this.updateLocalOrderStatus(orderId, 'CANCELLED');

    } catch (err) {
      console.error('Failed to reject order:', err);
      alert('Could not reject order. Please check the network connection.');
    } finally {
      this.isActionSubmitting.set(false);
    }
  }

  private updateLocalOrderStatus(orderId: string, newStatus: OrderStatus) {
    this.orders.update((list) =>
      list.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o))
    );
    if (this.selectedOrderSummary()?.orderId === orderId) {
      this.selectedOrderSummary.update((s) => (s ? { ...s, status: newStatus } : null));
    }
    if (this.selectedOrderDetail()?.orderId === orderId) {
      this.selectedOrderDetail.update((d) => (d ? { ...d, status: newStatus } : null));
    }
    this.loadTodaySnapshot();
  }

  resolveImageUrl(img?: string | null): string {
    if (!img) return '';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;

    // Remove '/api' from the end of the environment URL
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}/images/${img}`;
  }

  getPaymentImageUrl(img?: string | null): string {
    return this.resolveImageUrl(img);
  }

  getGoogleMapsUrl(lat?: number, lon?: number): string {
    if (lat === undefined || lon === undefined) return '';
    return `https://www.google.com/maps?q=${lat},${lon}`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
