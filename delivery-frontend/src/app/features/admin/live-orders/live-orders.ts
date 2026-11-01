import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import {
  AdminOrderDetails,
  OrderService,
  OrderStatus,
  OrderSummary,
} from '../../../core/services/order-service';
import { environment } from '../../../../environments/environment';
import * as L from 'leaflet';

interface LiveRiderPin {
  riderId: string;
  latitude: number;
  longitude: number;
  status: 'AVAILABLE' | 'BUSY' | string;
  updatedAt: Date;
}

@Component({
  selector: 'app-live-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, SlicePipe, UpperCasePipe],
  templateUrl: './live-orders.html',
  styleUrl: './live-orders.css',
})
export class LiveOrders implements OnInit, AfterViewInit, OnDestroy {
  private orderService = inject(OrderService);
  private router = inject(Router);

  @ViewChild('liveMapContainer', { static: false }) mapElement!: ElementRef<HTMLDivElement>;

  // Active Orders State
  isLoading = signal<boolean>(true);
  isSyncing = signal<boolean>(false);
  rawOrders = signal<OrderSummary[]>([]);
  queueScope = signal<'TODAY' | 'ALL_ACTIVE'>('TODAY');
  activeStageFilter = signal<'ALL' | 'PENDING' | 'PREPARING' | 'OUT_FOR_DELIVERY'>('ALL');
  searchQuery = signal<string>('');
  lastSyncedAt = signal<Date>(new Date());

  // Interactive Auto-Refresh Countdown (Optional 30s Poll)
  autoRefreshEnabled = signal<boolean>(false);
  countdownSeconds = signal<number>(30);
  private countdownTimer: any = null;

  // Live Rider WebSocket State (ws://localhost:8080/ws/rider-location)
  wsConnected = signal<boolean>(false);
  liveRiders = signal<Record<string, LiveRiderPin>>({});
  private ws: WebSocket | null = null;

  // Leaflet Map Instance & Layers
  private map: L.Map | null = null;
  private riderMarkers: Record<string, L.Marker> = {};
  private orderRouteLayer: L.LayerGroup | null = null;
  focusedOrderId = signal<string | null>(null);

  // Reused Slide-Over Order Details & Action Drawer State
  isDrawerOpen = signal<boolean>(false);
  isLoadingDetails = signal<boolean>(false);
  isActionSubmitting = signal<boolean>(false);
  selectedOrderSummary = signal<OrderSummary | null>(null);
  selectedOrderDetail = signal<AdminOrderDetails | null>(null);
  isPaymentZoomOpen = signal<boolean>(false);
  paymentImageError = signal<boolean>(false);

  readonly statusConfig: Record<string, { label: string; color: string; bgLight: string }> = {
    PENDING: { label: 'Pending Approval', color: '#ea580c', bgLight: '#fff7ed' },
    PREPARING: { label: 'Preparing / Needs Rider', color: '#2563eb', bgLight: '#eff6ff' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#7c3aed', bgLight: '#f5f3ff' },
    DELIVERED: { label: 'Delivered', color: '#059669', bgLight: '#ecfdf5' },
    CANCELLED: { label: 'Cancelled', color: '#dc2626', bgLight: '#fef2f2' },
  };

  private globalRefreshListener = () => this.triggerInteractiveRefresh();

  // Filter out DELIVERED and CANCELLED so only active orders appear
  activeOrders = computed(() =>
    this.rawOrders().filter(
      (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
    )
  );

  // Counts by Active Stage
  pendingCount = computed(() =>
    this.activeOrders().filter((o) => o.status === 'PENDING').length
  );
  preparingCount = computed(() =>
    this.activeOrders().filter((o) => o.status === 'PREPARING').length
  );
  outForDeliveryCount = computed(() =>
    this.activeOrders().filter((o) => o.status === 'OUT_FOR_DELIVERY').length
  );

  filteredActiveOrders = computed(() => {
    const stage = this.activeStageFilter();
    const q = this.searchQuery().trim().toLowerCase();

    return this.activeOrders().filter((order) => {
      const matchesStage = stage === 'ALL' || order.status === stage;
      const matchesQuery =
        !q ||
        order.orderId.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q);
      return matchesStage && matchesQuery;
    });
  });

  liveRiderList = computed(() => Object.values(this.liveRiders()));

  // Drawer Financial Breakdown
  drawerFoodSubtotal = computed(() => {
    const detail = this.selectedOrderDetail();
    if (!detail || !detail.items) return 0;
    return detail.items.reduce((sum, item) => sum + (item.priceAtPurchase * item.quantity), 0);
  });

  drawerDeliveryFee = computed(() => {
    const detail = this.selectedOrderDetail();
    if (!detail) return 0;
    return Math.max(0, detail.totalAmount - this.drawerFoodSubtotal());
  });

  ngOnInit() {
    this.loadActiveOrders(true);
    this.connectRiderLocationSocket();
    this.startCountdownLoop();
    window.addEventListener('admin-manual-refresh', this.globalRefreshListener);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initMagwayMap();
    }, 100);
  }

  ngOnDestroy() {
    window.removeEventListener('admin-manual-refresh', this.globalRefreshListener);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.map) {
      this.map.remove();
    }
  }

  // --- 1. FETCHING & INTERACTIVE REFRESH FOR ACTIVE ORDERS ---

  async loadActiveOrders(allowAutoFallback: boolean = false) {
    if (!this.isSyncing()) {
      this.isLoading.set(true);
    }

    try {
      const todayStr = this.formatDate(new Date());

      if (this.queueScope() === 'TODAY') {
        const res = await lastValueFrom(this.orderService.getOrdersByDate(todayStr));
        const todayList = res?.data || [];
        const activeToday = todayList.filter(
          (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
        );

        // If today has 0 active orders on initial load, fallback to recent queue so test orders show up
        if (allowAutoFallback && activeToday.length === 0) {
          this.queueScope.set('ALL_ACTIVE');
          const allRes = await lastValueFrom(this.orderService.getOrders(0, 30));
          this.rawOrders.set(allRes?.data || []);
        } else {
          this.rawOrders.set(todayList);
        }
      } else {
        const res = await lastValueFrom(this.orderService.getOrders(0, 30));
        this.rawOrders.set(res?.data || []);
      }

      this.lastSyncedAt.set(new Date());
      this.countdownSeconds.set(30);
    } catch (err) {
      console.error('Failed to load live orders:', err);
    } finally {
      this.isLoading.set(false);
      this.isSyncing.set(false);
    }
  }

  triggerInteractiveRefresh() {
    if (this.isSyncing()) return;
    this.isSyncing.set(true);
    this.loadActiveOrders(false);
  }

  switchQueueScope(scope: 'TODAY' | 'ALL_ACTIVE') {
    if (this.queueScope() === scope) return;
    this.queueScope.set(scope);
    this.triggerInteractiveRefresh();
  }

  toggleAutoRefresh() {
    this.autoRefreshEnabled.update((v) => !v);
    this.countdownSeconds.set(30);
  }

  private startCountdownLoop() {
    this.countdownTimer = setInterval(() => {
      if (!this.autoRefreshEnabled() || this.isSyncing() || this.isLoading()) return;

      const next = this.countdownSeconds() - 1;
      if (next <= 0) {
        this.triggerInteractiveRefresh();
        this.countdownSeconds.set(30);
      } else {
        this.countdownSeconds.set(next);
      }
    }, 1000);
  }

  // --- 2. LEAFLET MAP & REAL-TIME WEBSOCKET RIDER TRACKING ---

  private initMagwayMap() {
    if (!this.mapElement?.nativeElement) return;

    // Centered on Magway, Myanmar
    this.map = L.map(this.mapElement.nativeElement).setView([20.1495, 94.932], 15);

    // 1. Google Maps Standard Streets
    const googleStreets = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps',
      }
    );

    // 2. Google Maps Hybrid
    const googleHybrid = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps',
      }
    );

    // Set Google Streets as the default view
    googleStreets.addTo(this.map);

    L.control
      .layers(
        {
          '🗺️ Google Streets': googleStreets,
          '🛰️ Google Satellite': googleHybrid,
        },
        {},
        { position: 'topright' }
      )
      .addTo(this.map);

    this.orderRouteLayer = L.layerGroup().addTo(this.map);

    // Ensure map renders properly within the flexible grid container
    setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 200);
  }

  centerMapOnMagway() {
    if (!this.map) return;
    this.map.setView([20.1495, 94.932], 14);
  }

  private connectRiderLocationSocket() {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsBase = `${wsProtocol}//${window.location.host}`;
      this.ws = new WebSocket(`${wsBase}/ws/rider-location`);

      this.ws.onopen = () => this.wsConnected.set(true);
      this.ws.onclose = () => this.wsConnected.set(false);
      this.ws.onerror = () => this.wsConnected.set(false);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.riderId && data.latitude != null && data.longitude != null) {
            const pin: LiveRiderPin = {
              riderId: data.riderId,
              latitude: Number(data.latitude),
              longitude: Number(data.longitude),
              status: data.status || 'AVAILABLE',
              updatedAt: new Date(),
            };

            this.liveRiders.update((prev) => ({
              ...prev,
              [pin.riderId]: pin,
            }));

            this.updateRiderMarkerOnMap(pin);
          }
        } catch {
          // Ignore non-JSON frames
        }
      };
    } catch (err) {
      console.warn('Could not open rider WebSocket:', err);
    }
  }

  private updateRiderMarkerOnMap(pin: LiveRiderPin) {
    if (!this.map) return;

    const isAvail = pin.status === 'AVAILABLE';
    const badgeColor = isAvail ? '#10b981' : '#ea580c';

    const icon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="
          background:${badgeColor};
          color:#fff;
          padding:4px 8px;
          border-radius:999px;
          font-weight:800;
          font-size:11px;
          border:2px solid #fff;
          box-shadow:0 4px 10px rgba(0,0,0,0.25);
          white-space:nowrap;
        ">
          🛵 ${pin.status}
        </div>
      `,
      iconSize: [80, 28],
      iconAnchor: [40, 14],
    });

    if (this.riderMarkers[pin.riderId]) {
      this.riderMarkers[pin.riderId].setLatLng([pin.latitude, pin.longitude]);
      this.riderMarkers[pin.riderId].setIcon(icon);
    } else {
      this.riderMarkers[pin.riderId] = L.marker([pin.latitude, pin.longitude], { icon })
        .addTo(this.map)
        .bindPopup(`<b>Rider ID:</b> ${pin.riderId.slice(-6)}<br><b>Status:</b> ${pin.status}`);
    }
  }

  focusRiderOnMap(pin: LiveRiderPin) {
    if (!this.map) return;
    this.map.setView([pin.latitude, pin.longitude], 16);
    this.riderMarkers[pin.riderId]?.openPopup();
  }

  async focusOrderOnMap(order: OrderSummary) {
    this.focusedOrderId.set(order.orderId);
    try {
      const res = await lastValueFrom(this.orderService.getAdminOrderDetails(order.orderId));
      if (res?.data) {
        this.plotOrderLocationsOnMap(res.data);
      }
    } catch (err) {
      console.warn('Could not plot order on map:', err);
    }
  }

  private plotOrderLocationsOnMap(detail: AdminOrderDetails) {
    if (!this.map || !this.orderRouteLayer) return;

    this.orderRouteLayer.clearLayers();
    const bounds: [number, number][] = [];

    // 1. Plot Pickup Restaurants
    if (detail.restaurants?.length) {
      for (const rest of detail.restaurants) {
        if (rest.latitude != null && rest.longitude != null) {
          const coords: [number, number] = [rest.latitude, rest.longitude];
          bounds.push(coords);

          const restIcon = L.divIcon({
            className: 'custom-map-pin',
            html: `<div style="background:#2563eb;color:#fff;padding:4px 9px;border-radius:8px;font-weight:800;font-size:11px;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.2);white-space:nowrap;">🏪 ${rest.name}</div>`,
            iconSize: [110, 26],
            iconAnchor: [55, 13],
          });

          L.marker(coords, { icon: restIcon })
            .bindPopup(`<b>Pickup:</b> ${rest.name}<br>${rest.address}`)
            .addTo(this.orderRouteLayer);
        }
      }
    }

    // 2. Plot Customer Delivery Destination
    if (detail.customer?.latitude != null && detail.customer?.longitude != null) {
      const custCoords: [number, number] = [detail.customer.latitude, detail.customer.longitude];
      bounds.push(custCoords);

      const custIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background:#ea580c;color:#fff;padding:4px 9px;border-radius:8px;font-weight:800;font-size:11px;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.2);white-space:nowrap;">📍 ${detail.customer.name}</div>`,
        iconSize: [110, 26],
        iconAnchor: [55, 13],
      });

      L.marker(custCoords, { icon: custIcon })
        .bindPopup(`<b>Customer:</b> ${detail.customer.name}<br>${detail.deliveryAddress}`)
        .addTo(this.orderRouteLayer);

      // Draw dashed delivery route line from restaurants to customer
      if (bounds.length > 1) {
        L.polyline(bounds, {
          color: '#ea580c',
          weight: 3,
          dashArray: '6, 8',
        }).addTo(this.orderRouteLayer);
      }
    }

    // 3. Plot Assigned Rider if coordinates exist
    if (detail.rider?.latitude != null && detail.rider?.longitude != null) {
      bounds.push([detail.rider.latitude, detail.rider.longitude]);
    }

    if (bounds.length > 0) {
      this.map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    }
  }

  // --- 3. REUSED ORDER DETAILS & ACTION DRAWER ---

  async openOrderDrawer(order: OrderSummary, event?: MouseEvent) {
    event?.stopPropagation();
    this.selectedOrderSummary.set(order);
    this.selectedOrderDetail.set(null);
    this.paymentImageError.set(false);
    this.isPaymentZoomOpen.set(false);
    this.isDrawerOpen.set(true);
    this.isLoadingDetails.set(true);
    this.focusedOrderId.set(order.orderId);

    try {
      const res = await lastValueFrom(this.orderService.getAdminOrderDetails(order.orderId));
      if (res?.data) {
        this.selectedOrderDetail.set(res.data);
        this.plotOrderLocationsOnMap(res.data);
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
      this.router.navigate(['/admin/orders', orderId, 'assign']);
    } catch (err) {
      console.error('Failed to accept order:', err);
      alert('Could not accept order. Please try again.');
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
      this.closeOrderDrawer();
    } catch (err) {
      console.error('Failed to reject order:', err);
      alert('Could not reject order. Please check the network connection.');
    } finally {
      this.isActionSubmitting.set(false);
    }
  }

  goToAssignRiderPage(orderId: string, event?: MouseEvent) {
    event?.stopPropagation();
    this.closeOrderDrawer();
    this.router.navigate(['/admin/orders', orderId, 'assign']);
  }

  private updateLocalOrderStatus(orderId: string, newStatus: OrderStatus) {
    this.rawOrders.update((list) =>
      list.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o))
    );
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

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
