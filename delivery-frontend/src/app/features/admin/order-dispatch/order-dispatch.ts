import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import {
  AdminOrderDetails,
  NearestRider,
  OrderService,
} from '../../../core/services/order-service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-order-dispatch',
  standalone: true,
  imports: [CommonModule, DecimalPipe, SlicePipe, UpperCasePipe, RouterLink],
  templateUrl: './order-dispatch.html',
  styleUrl: './order-dispatch.css',
})
export class OrderDispatch implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);

  orderId = signal<string>('');
  orderDetail = signal<AdminOrderDetails | null>(null);
  nearestRider = signal<NearestRider | null>(null);

  // UI States
  isLoadingOrder = signal<boolean>(true);
  isScanningRider = signal<boolean>(true);
  isAssigning = signal<boolean>(false);
  isAssignedSuccess = signal<boolean>(false);
  riderScanError = signal<string | null>(null);

  // Live WebSocket telemetry from ws://localhost:8080/ws/rider-location
  wsConnected = signal<boolean>(false);
  liveRiderCoordinates = signal<{ latitude: number; longitude: number } | null>(null);
  private ws: WebSocket | null = null;

  foodSubtotal = computed(() => {
    const detail = this.orderDetail();
    if (!detail?.items) return 0;
    return detail.items.reduce((sum, i) => sum + i.priceAtPurchase * i.quantity, 0);
  });

  deliveryFee = computed(() => {
    const detail = this.orderDetail();
    if (!detail) return 0;
    return Math.max(0, detail.totalAmount - this.foodSubtotal());
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('orderId') || '';
    this.orderId.set(id);

    if (id) {
      this.loadOrderContext(id);
      this.scanForNearestRider(id);
      this.connectRiderLocationSocket();
    }
  }

  ngOnDestroy() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async loadOrderContext(id: string) {
    this.isLoadingOrder.set(true);
    try {
      const res = await lastValueFrom(this.orderService.getAdminOrderDetails(id));
      if (res?.data) {
        this.orderDetail.set(res.data);
      }
    } catch (err) {
      console.error('Could not load order details on dispatch page:', err);
    } finally {
      this.isLoadingOrder.set(false);
    }
  }

  async scanForNearestRider(id: string = this.orderId()) {
    if (!id) return;
    this.isScanningRider.set(true);
    this.riderScanError.set(null);

    try {
      const res = await lastValueFrom(this.orderService.getNearestRider(id));
      if (res?.data && res.data.riderId) {
        this.nearestRider.set(res.data);
      } else {
        this.nearestRider.set(null);
        this.riderScanError.set('No available riders found nearby at this moment.');
      }
    } catch (err: any) {
      console.warn('Nearest rider lookup returned error:', err);
      this.nearestRider.set(null);
      const backendMsg = err?.error?.message || 'No available riders are online right now.';
      this.riderScanError.set(backendMsg);
    } finally {
      this.isScanningRider.set(false);
    }
  }

  async confirmAssignRider() {
    const rider = this.nearestRider();
    const id = this.orderId();
    if (!rider || !id || this.isAssigning()) return;

    this.isAssigning.set(true);
    try {
      const res = await lastValueFrom(
        this.orderService.assignOrderToRider(id, rider.riderId)
      );

      if (res?.data) {
        this.orderDetail.update((d) =>
          d ? { ...d, status: res.data.status } : null
        );
      }
      this.isAssignedSuccess.set(true);
    } catch (err: any) {
      console.error('Failed to assign rider:', err);
      alert(err?.error?.message || 'Could not assign rider. The rider may no longer be available.');
      // Re-scan automatically in case that rider became busy
      this.scanForNearestRider(id);
    } finally {
      this.isAssigning.set(false);
    }
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
          const payload = JSON.parse(event.data);
          // If the matched rider broadcasts live coordinates, show them
          if (payload?.riderId && payload.riderId === this.nearestRider()?.riderId) {
            this.liveRiderCoordinates.set({
              latitude: payload.latitude,
              longitude: payload.longitude,
            });
          }
          // If we had no available rider and a rider just came online as AVAILABLE, auto-rescan!
          if (!this.nearestRider() && !this.isScanningRider() && payload?.status === 'AVAILABLE') {
            this.scanForNearestRider(this.orderId());
          }
        } catch {
          // Ignore non-JSON frames
        }
      };
    } catch (e) {
      console.warn('WebSocket connection skipped:', e);
    }
  }

  resolveImageUrl(img?: string | null): string {
    if (!img) return '';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}/images/${img}`;
  }

  backToDashboard() {
    this.router.navigate(['/admin/dashboard']);
  }
}
