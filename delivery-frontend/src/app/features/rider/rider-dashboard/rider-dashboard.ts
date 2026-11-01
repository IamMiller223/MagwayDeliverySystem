import {
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
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import * as L from 'leaflet';
import {
  RiderLocationWsPayload,
  RiderNotificationEvent,
  RiderOrderDetails,
  RiderPickupLocation,
  RiderProfile,
  RiderService,
  RiderStats,
  RiderTaskSummary,
} from '../../../core/services/rider-service';
import { AuthService } from '../../../core/services/AuthService';
import { environment } from '../../../../environments/environment';

export interface OptimizedPickupStop extends RiderPickupLocation {
  sequenceNumber: number;
  distanceFromPrevKm: number;
}

export type NavigationTargetMode = 'FULL_ROUTE' | 'PICKUP' | 'CUSTOMER';

@Component({
  selector: 'app-rider-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, SlicePipe, UpperCasePipe],
  templateUrl: './rider-dashboard.html',
  styleUrl: './rider-dashboard.css',
})
export class RiderDashboard implements OnInit, OnDestroy {
  private riderService = inject(RiderService);
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('routeMapContainer', { static: false })
  routeMapElement!: ElementRef<HTMLDivElement>;

  @ViewChild('fullNavMapContainer', { static: false })
  fullNavMapElement!: ElementRef<HTMLDivElement>;

  // 1. Theme State (Light Mode / Dark Mode)
  isDarkMode = signal<boolean>(localStorage.getItem('magway_rider_theme') === 'dark');

  // 2. Rider Identity & Read-Only Status State
  riderId = signal<string>('');
  riderProfile = signal<RiderProfile | null>(null);
  riderStatus = signal<'AVAILABLE' | 'BUSY'>('AVAILABLE');
  stats = signal<RiderStats>({ activeCount: 0, completedCount: 0 });

  // 3. Mobile Navigation Tabs & Tasks State
  activeTab = signal<'ACTIVE' | 'COMPLETED' | 'PROFILE'>('ACTIVE');
  isLoadingTasks = signal<boolean>(true);
  activeTasks = signal<RiderTaskSummary[]>([]);
  completedTasks = signal<RiderTaskSummary[]>([]);

  // 4. Selected Task Details & Optimized Stops State
  isDetailModalOpen = signal<boolean>(false);
  isLoadingDetail = signal<boolean>(false);
  isCompletingOrder = signal<boolean>(false);
  selectedOrderDetails = signal<RiderOrderDetails | null>(null);
  optimizedPickups = signal<OptimizedPickupStop[]>([]);
  private routeMap: L.Map | null = null;

  // 5. In-App Fullscreen Live Navigation State (OSRM Real Road Routing)
  isFullNavOpen = signal<boolean>(false);
  isCalculatingRoute = signal<boolean>(false);
  followRiderOnNav = signal<boolean>(true);
  navTargetMode = signal<NavigationTargetMode>('FULL_ROUTE');
  selectedPickupIndex = signal<number>(0);

  navRoadDistanceKm = signal<number>(0);
  navDurationMinutes = signal<number>(0);
  navTargetTitle = signal<string>('');
  navTargetSubtitle = signal<string>('');
  navNextStepInstruction = signal<string>('လမ်းကြောင်းအတိုင်း မောင်းနှင်ပါ');

  private fullNavMap: L.Map | null = null;
  private fullNavRiderMarker: L.Marker | null = null;
  private fullNavRouteLayer: L.LayerGroup | null = null;

  // 6. Always-On 5-Second GPS & Auto-Reconnect WebSocket State
  wsConnected = signal<boolean>(false);
  gpsPermissionState = signal<'TRACKING' | 'WAITING' | 'DENIED'>('WAITING');
  currentLat = signal<number | null>(null);
  currentLng = signal<number | null>(null);
  lastGpsSentAt = signal<Date | null>(null);

  private isComponentAlive = true;
  private ws: WebSocket | null = null;
  private wsReconnectTimeout: any = null;
  private gpsWatchId: number | null = null;
  private gpsSendInterval: any = null;
  private wakeLockSentinel: any = null;

  // 7. Real-Time SSE Notifications (/api/rider/{id}/notifications)
  notifications = signal<RiderNotificationEvent[]>([]);
  unreadNotifCount = signal<number>(0);
  isNotifDrawerOpen = signal<boolean>(false);
  latestToast = signal<RiderNotificationEvent | null>(null);
  private sseAbortController: AbortController | null = null;

  private visibilityListener = () => this.onAppVisibilityOrNetworkChange();
  private onlineListener = () => this.onAppVisibilityOrNetworkChange();

  ngOnInit() {
    this.resolveLoggedInRiderId();
    if (this.riderId()) {
      this.loadAllDashboardData();
      this.startMandatoryGpsTracking();
      this.connectLocationWebSocket();
      this.startFiveSecondBroadcastLoop();
      this.startNotificationStream();
      this.requestScreenWakeLock();

      document.addEventListener('visibilitychange', this.visibilityListener);
      window.addEventListener('online', this.onlineListener);
    }
  }

  ngOnDestroy() {
    this.isComponentAlive = false;
    document.removeEventListener('visibilitychange', this.visibilityListener);
    window.removeEventListener('online', this.onlineListener);

    if (this.wsReconnectTimeout) clearTimeout(this.wsReconnectTimeout);
    if (this.gpsSendInterval) clearInterval(this.gpsSendInterval);
    if (this.gpsWatchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
    }
    if (this.wakeLockSentinel) {
      this.wakeLockSentinel.release().catch(() => {});
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    if (this.sseAbortController) {
      this.sseAbortController.abort();
    }
    this.destroyRouteMap();
    this.destroyFullNavMap();
  }

  // ==================== 1. THEME & DATA FETCHING ====================

  toggleTheme() {
    this.isDarkMode.update((dark) => {
      const next = !dark;
      localStorage.setItem('magway_rider_theme', next ? 'dark' : 'light');
      return next;
    });
  }

  private resolveLoggedInRiderId() {
    const user: any = this.authService.currentUser();
    const id =
      user?.userId ||
      user?.id ||
      user?.sub ||
      localStorage.getItem('userId') ||
      '';
    this.riderId.set(id);
  }

  async loadAllDashboardData() {
    const id = this.riderId();
    if (!id) return;

    this.isLoadingTasks.set(true);
    try {
      const [profileRes, statsRes, activeList, completedList] = await Promise.all([
        lastValueFrom(this.riderService.getRiderProfile(id)).catch(() => null),
        lastValueFrom(this.riderService.getRiderStats(id)).catch(() => ({
          activeCount: 0,
          completedCount: 0,
        })),
        lastValueFrom(this.riderService.getRiderTasks(id, 'active')).catch(() => []),
        lastValueFrom(this.riderService.getRiderTasks(id, 'completed')).catch(() => []),
      ]);

      const activeArr = Array.isArray(activeList)
        ? activeList
        : (activeList as any)?.data || [];
      const completedArr = Array.isArray(completedList)
        ? completedList
        : (completedList as any)?.data || [];

      this.activeTasks.set(activeArr);
      this.completedTasks.set(completedArr);

      if (profileRes?.data) {
        this.riderProfile.set(profileRes.data);
      }

      const backendStatus = String(profileRes?.data?.status || '').toUpperCase();
      if (activeArr.length > 0 || backendStatus === 'BUSY') {
        this.riderStatus.set('BUSY');
      } else {
        this.riderStatus.set('AVAILABLE');
      }

      const rawStats: any = (statsRes as any)?.data ? (statsRes as any).data : statsRes;
      this.stats.set({
        activeCount: rawStats?.activeCount ?? activeArr.length,
        completedCount: rawStats?.completedCount ?? completedArr.length,
      });
    } catch (err) {
      console.error('Failed to load rider dashboard data:', err);
    } finally {
      this.isLoadingTasks.set(false);
    }
  }

  // ==================== 2. MANDATORY 5s GPS & AUTO-RECONNECT WEBSOCKET ====================

  private startMandatoryGpsTracking() {
    if (!navigator.geolocation) {
      this.gpsPermissionState.set('DENIED');
      return;
    }

    this.gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const isFirstFix = this.currentLat() === null;

        this.currentLat.set(lat);
        this.currentLng.set(lng);
        this.gpsPermissionState.set('TRACKING');

        // Update live Rider pin inside Fullscreen Navigation if open
        this.updateLiveRiderPinOnFullNav(lat, lng);

        if (isFirstFix) {
          this.sendLocationFrame();
        }
      },
      (err) => {
        console.warn('GPS watch error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          this.gpsPermissionState.set('DENIED');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );
  }

  private startFiveSecondBroadcastLoop() {
    if (this.gpsSendInterval) clearInterval(this.gpsSendInterval);

    this.gpsSendInterval = setInterval(() => {
      this.sendLocationFrame();
    }, 5000);
  }

  private connectLocationWebSocket() {
    if (!this.isComponentAlive) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsBase = `${wsProtocol}//${window.location.host}`;
      this.ws = new WebSocket(`${wsBase}/ws/rider-location`);

      this.ws.onopen = () => {
        this.wsConnected.set(true);
        this.sendLocationFrame();
      };

      this.ws.onclose = () => {
        this.wsConnected.set(false);
        this.scheduleWebSocketReconnect();
      };

      this.ws.onerror = () => {
        this.wsConnected.set(false);
      };
    } catch {
      this.wsConnected.set(false);
      this.scheduleWebSocketReconnect();
    }
  }

  private scheduleWebSocketReconnect() {
    if (!this.isComponentAlive) return;
    if (this.wsReconnectTimeout) clearTimeout(this.wsReconnectTimeout);

    this.wsReconnectTimeout = setTimeout(() => {
      this.connectLocationWebSocket();
    }, 3000);
  }

  private onAppVisibilityOrNetworkChange() {
    if (!this.isComponentAlive) return;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connectLocationWebSocket();
    }

    if (document.visibilityState === 'visible') {
      this.requestScreenWakeLock();
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = Number(pos.coords.latitude.toFixed(6));
            const lng = Number(pos.coords.longitude.toFixed(6));
            this.currentLat.set(lat);
            this.currentLng.set(lng);
            this.gpsPermissionState.set('TRACKING');
            this.updateLiveRiderPinOnFullNav(lat, lng);
            this.sendLocationFrame();
          },
          () => {},
          { enableHighAccuracy: true }
        );
      }
    }
  }

  private async requestScreenWakeLock() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // Ignore if unsupported
    }
  }

  private sendLocationFrame() {
    const lat = this.currentLat();
    const lng = this.currentLng();

    if (
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      !this.riderId() ||
      lat === null ||
      lng === null
    ) {
      return;
    }

    const payload: RiderLocationWsPayload = {
      riderId: this.riderId(),
      latitude: lat,
      longitude: lng,
      status: this.riderStatus(),
    };

    this.ws.send(JSON.stringify(payload));
    this.lastGpsSentAt.set(new Date());
  }

  // ==================== 3. SHORTEST-PATH OPTIMIZATION & ORDER DETAILS ====================

  /**
   * Orders multiple pickup restaurants using Nearest-Neighbor shortest path
   * starting from the Rider's current GPS position (or Magway center if waiting).
   */
  private computeOptimizedPickups(rawPickups: RiderPickupLocation[]): OptimizedPickupStop[] {
    if (!rawPickups || rawPickups.length === 0) return [];

    const remaining = [...rawPickups];
    const ordered: OptimizedPickupStop[] = [];

    let curLat = this.currentLat() ?? remaining[0].latitude ?? 20.1495;
    let curLng = this.currentLng() ?? remaining[0].longitude ?? 94.932;

    let seq = 1;
    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const d = this.haversineKm(
          curLat,
          curLng,
          remaining[i].latitude,
          remaining[i].longitude
        );
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }

      const chosen = remaining.splice(nearestIdx, 1)[0];
      ordered.push({
        ...chosen,
        sequenceNumber: seq++,
        distanceFromPrevKm: Number(minDist.toFixed(2)),
      });

      curLat = chosen.latitude;
      curLng = chosen.longitude;
    }

    return ordered;
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async openTaskDetails(orderId: string) {
    this.isDetailModalOpen.set(true);
    this.isLoadingDetail.set(true);
    this.selectedOrderDetails.set(null);

    try {
      const res: any = await lastValueFrom(this.riderService.getRiderOrderDetails(orderId));
      const detail: RiderOrderDetails = res?.data ? res.data : res;
      this.selectedOrderDetails.set(detail);

      // Compute shortest-path sequence for pickup locations
      const sortedStops = this.computeOptimizedPickups(detail.pickupLocations || []);
      this.optimizedPickups.set(sortedStops);

      setTimeout(() => {
        this.initMiniPreviewMap(detail, sortedStops);
      }, 150);
    } catch (err) {
      console.error('Failed to load rider order details:', err);
      alert('အော်ဒါအသေးစိတ် ရယူရာတွင် အခက်အခဲရှိနေပါသည်။');
    } finally {
      this.isLoadingDetail.set(false);
    }
  }

  closeTaskDetails() {
    this.isDetailModalOpen.set(false);
    this.selectedOrderDetails.set(null);
    this.destroyRouteMap();
  }

  private async initMiniPreviewMap(
    detail: RiderOrderDetails,
    stops: OptimizedPickupStop[]
  ) {
    this.destroyRouteMap();
    if (!this.routeMapElement?.nativeElement) return;

    this.routeMap = L.map(this.routeMapElement.nativeElement, {
      zoomControl: false,
    }).setView([20.1495, 94.932], 14);

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(this.routeMap);

    const waypoints: [number, number][] = [];

    if (this.currentLat() !== null && this.currentLng() !== null) {
      waypoints.push([this.currentLat()!, this.currentLng()!]);
      this.addPinToMap(
        this.routeMap,
        [this.currentLat()!, this.currentLng()!],
        '🛵 သင်',
        '#059669'
      );
    }

    stops.forEach((s) => {
      waypoints.push([s.latitude, s.longitude]);
      this.addPinToMap(
        this.routeMap!,
        [s.latitude, s.longitude],
        `🏪 (${s.sequenceNumber}) ${s.restaurantName}`,
        '#2563eb'
      );
    });

    if (detail.recipient?.latitude != null && detail.recipient?.longitude != null) {
      waypoints.push([detail.recipient.latitude, detail.recipient.longitude]);
      this.addPinToMap(
        this.routeMap,
        [detail.recipient.latitude, detail.recipient.longitude],
        `📍 ဝယ်သူ: ${detail.recipient.name}`,
        '#ea580c'
      );
    }

    await this.drawOsrmRoadLineOnMap(this.routeMap, waypoints, false);

    if (waypoints.length > 0) {
      this.routeMap.fitBounds(waypoints, { padding: [30, 30], maxZoom: 16 });
    }
    setTimeout(() => this.routeMap?.invalidateSize(), 200);
  }

  private destroyRouteMap() {
    if (this.routeMap) {
      this.routeMap.remove();
      this.routeMap = null;
    }
  }

  // ==================== 4. IN-APP FULLSCREEN LIVE NAVIGATION (OSRM ROAD ROUTING) ====================

  openInAppNavigation(mode: NavigationTargetMode, pickupIdx: number = 0) {
    if (!this.selectedOrderDetails()) return;

    this.navTargetMode.set(mode);
    this.selectedPickupIndex.set(pickupIdx);
    this.isFullNavOpen.set(true);
    this.requestScreenWakeLock();

    setTimeout(() => {
      this.initFullNavigationMap();
      this.renderActiveNavigationRoute();
    }, 120);
  }

  switchNavigationTarget(mode: NavigationTargetMode, pickupIdx: number = 0) {
    this.navTargetMode.set(mode);
    this.selectedPickupIndex.set(pickupIdx);
    this.renderActiveNavigationRoute();
  }

  closeInAppNavigation() {
    this.isFullNavOpen.set(false);
    this.destroyFullNavMap();
  }

  private initFullNavigationMap() {
    this.destroyFullNavMap();
    if (!this.fullNavMapElement?.nativeElement) return;

    const startLat = this.currentLat() ?? 20.1495;
    const startLng = this.currentLng() ?? 94.932;

    this.fullNavMap = L.map(this.fullNavMapElement.nativeElement, {
      zoomControl: false,
    }).setView([startLat, startLng], 15);

    const googleStreets = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps',
      }
    );

    const googleHybrid = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps',
      }
    );

    googleStreets.addTo(this.fullNavMap);

    L.control
      .layers(
        { '🗺️ လမ်းမြေပုံ': googleStreets, '🛰️ ဂြိုဟ်တုမြေပုံ': googleHybrid },
        {},
        { position: 'bottomright' }
      )
      .addTo(this.fullNavMap);

    this.fullNavRouteLayer = L.layerGroup().addTo(this.fullNavMap);

    // Disable auto-follow if rider manually drags map
    this.fullNavMap.on('dragstart', () => {
      this.followRiderOnNav.set(false);
    });

    setTimeout(() => this.fullNavMap?.invalidateSize(), 200);
  }

  private destroyFullNavMap() {
    if (this.fullNavMap) {
      this.fullNavMap.remove();
      this.fullNavMap = null;
      this.fullNavRiderMarker = null;
      this.fullNavRouteLayer = null;
    }
  }

  /**
   * Builds the waypoint chain based on selected target mode and queries OSRM
   * for actual street geometry, road distance (km), and driving time (minutes).
   */
  async renderActiveNavigationRoute() {
    const detail = this.selectedOrderDetails();
    if (!this.fullNavMap || !this.fullNavRouteLayer || !detail) return;

    this.fullNavRouteLayer.clearLayers();

    const stops = this.optimizedPickups();
    const riderLat = this.currentLat() ?? stops[0]?.latitude ?? 20.1495;
    const riderLng = this.currentLng() ?? stops[0]?.longitude ?? 94.932;

    // Place or update Live Rider Marker
    this.updateLiveRiderPinOnFullNav(riderLat, riderLng);

    const waypoints: [number, number][] = [[riderLat, riderLng]];
    const mode = this.navTargetMode();

    if (mode === 'PICKUP') {
      const stop = stops[this.selectedPickupIndex()] || stops[0];
      if (stop) {
        this.navTargetTitle.set(`ဆိုင် (${stop.sequenceNumber}) - ${stop.restaurantName}`);
        this.navTargetSubtitle.set(stop.address);
        waypoints.push([stop.latitude, stop.longitude]);

        this.addPinToLayer(
          this.fullNavRouteLayer,
          [stop.latitude, stop.longitude],
          `🏪 (${stop.sequenceNumber}) ${stop.restaurantName}`,
          '#2563eb'
        );
      }
    } else if (mode === 'CUSTOMER') {
      const recip = detail.recipient;
      this.navTargetTitle.set(`ဝယ်သူ - ${recip.name}`);
      this.navTargetSubtitle.set(detail.deliveryDestinationAddress);
      waypoints.push([recip.latitude, recip.longitude]);

      this.addPinToLayer(
        this.fullNavRouteLayer,
        [recip.latitude, recip.longitude],
        `📍 ဝယ်သူ: ${recip.name}`,
        '#ea580c'
      );
    } else {
      // FULL_ROUTE: Rider -> All Optimized Pickups -> Customer Destination
      this.navTargetTitle.set('လမ်းကြောင်းအပြည့်အစုံ (ဆိုင်အားလုံး ➔ ဝယ်သူ)');
      this.navTargetSubtitle.set(
        `ဆိုင် (${stops.length}) ဆိုင်မှတစ်ဆင့် ${detail.recipient.name} ထံသို့`
      );

      stops.forEach((s) => {
        waypoints.push([s.latitude, s.longitude]);
        this.addPinToLayer(
          this.fullNavRouteLayer!,
          [s.latitude, s.longitude],
          `🏪 (${s.sequenceNumber}) ${s.restaurantName}`,
          '#2563eb'
        );
      });

      if (detail.recipient?.latitude != null && detail.recipient?.longitude != null) {
        waypoints.push([detail.recipient.latitude, detail.recipient.longitude]);
        this.addPinToLayer(
          this.fullNavRouteLayer,
          [detail.recipient.latitude, detail.recipient.longitude],
          `📍 ဝယ်သူ: ${detail.recipient.name}`,
          '#ea580c'
        );
      }
    }

    await this.drawOsrmRoadLineOnMap(this.fullNavRouteLayer, waypoints, true);

    if (waypoints.length > 0 && this.fullNavMap) {
      this.fullNavMap.fitBounds(waypoints, { padding: [55, 55], maxZoom: 17 });
    }
  }

  /**
   * Fetches real street geometry & turn-by-turn distance/duration from OSRM
   */
  private async drawOsrmRoadLineOnMap(
    targetLayer: L.Map | L.LayerGroup,
    waypoints: [number, number][],
    updateTelemetrySignals: boolean
  ) {
    if (waypoints.length < 2) return;

    if (updateTelemetrySignals) {
      this.isCalculatingRoute.set(true);
    }

    try {
      const coordString = waypoints
        .map(([lat, lng]) => `${lng},${lat}`)
        .join(';');

      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true`;
      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data?.code === 'Ok' && data.routes?.length > 0) {
        const route = data.routes[0];
        const geoCoords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number]
        );

        // Outer casing + Inner road navigation line (Google Maps style)
        L.polyline(geoCoords, {
          color: '#1e3a8a',
          weight: 9,
          opacity: 0.45,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(targetLayer as any);

        L.polyline(geoCoords, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(targetLayer as any);

        if (updateTelemetrySignals) {
          const distKm = Number((route.distance / 1000).toFixed(2));
          // Estimate motorcycle speed in Magway (~25 km/h minimum realistic time)
          const estMins = Math.max(1, Math.round(route.duration / 60));
          this.navRoadDistanceKm.set(distKm);
          this.navDurationMinutes.set(estMins);

          const firstStep = route.legs?.[0]?.steps?.[1] || route.legs?.[0]?.steps?.[0];
          if (firstStep?.name) {
            this.navNextStepInstruction.set(
              `${firstStep.name} လမ်းကြောင်းအတိုင်း ဆက်လက်မောင်းနှင်ပါ`
            );
          } else {
            this.navNextStepInstruction.set('ပြသထားသော အပြာရောင်လမ်းကြောင်းအတိုင်း မောင်းနှင်ပါ');
          }
        }
        return;
      }
    } catch {
      // Fallback to straight line if offline
    } finally {
      if (updateTelemetrySignals) {
        this.isCalculatingRoute.set(false);
      }
    }

    // Fallback dashed polyline if OSRM request fails
    L.polyline(waypoints, {
      color: '#ea580c',
      weight: 4,
      dashArray: '8, 8',
    }).addTo(targetLayer as any);
  }

  private updateLiveRiderPinOnFullNav(lat: number, lng: number) {
    if (!this.fullNavMap) return;

    const riderIcon = L.divIcon({
      className: 'live-rider-nav-marker',
      html: `
        <div style="
          background:#059669;
          color:#ffffff;
          padding:5px 12px;
          border-radius:999px;
          font-weight:800;
          font-size:12px;
          border:2px solid #ffffff;
          box-shadow:0 0 0 6px rgba(5,150,105,0.28), 0 4px 12px rgba(0,0,0,0.35);
          white-space:nowrap;
        ">
          🛵 သင်ရှိနေသောနေရာ
        </div>
      `,
      iconSize: [140, 32],
      iconAnchor: [70, 16],
    });

    if (this.fullNavRiderMarker) {
      this.fullNavRiderMarker.setLatLng([lat, lng]);
    } else {
      this.fullNavRiderMarker = L.marker([lat, lng], {
        icon: riderIcon,
        zIndexOffset: 1000,
      }).addTo(this.fullNavMap);
    }

    if (this.followRiderOnNav()) {
      this.fullNavMap.panTo([lat, lng], { animate: true });
    }
  }

  recenterOnRiderInFullNav() {
    this.followRiderOnNav.set(true);
    if (this.fullNavMap && this.currentLat() !== null && this.currentLng() !== null) {
      this.fullNavMap.flyTo([this.currentLat()!, this.currentLng()!], 17, {
        duration: 0.5,
      });
    }
  }

  private addPinToMap(
    map: L.Map,
    coords: [number, number],
    label: string,
    bgColor: string
  ) {
    const icon = L.divIcon({
      className: 'rider-custom-pin',
      html: `<div style="background:${bgColor};color:#fff;padding:4px 10px;border-radius:8px;font-weight:800;font-size:11px;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.3);white-space:nowrap;">${label}</div>`,
      iconSize: [150, 26],
      iconAnchor: [75, 13],
    });
    L.marker(coords, { icon }).addTo(map);
  }

  private addPinToLayer(
    layer: L.LayerGroup,
    coords: [number, number],
    label: string,
    bgColor: string
  ) {
    const icon = L.divIcon({
      className: 'rider-custom-pin',
      html: `<div style="background:${bgColor};color:#fff;padding:5px 11px;border-radius:8px;font-weight:800;font-size:11px;border:2px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.35);white-space:nowrap;">${label}</div>`,
      iconSize: [155, 28],
      iconAnchor: [77, 14],
    });
    L.marker(coords, { icon }).addTo(layer);
  }

  async handleCompleteOrder(orderId: string) {
    if (this.isCompletingOrder()) return;
    if (!confirm('ဤအော်ဒါကို ဝယ်သူထံ အောင်မြင်စွာ ပို့ဆောင်ပြီးစီးပြီမှာ သေချာပါသလား?')) {
      return;
    }

    this.isCompletingOrder.set(true);
    try {
      await lastValueFrom(
        this.riderService.completeOrder(this.riderId(), orderId)
      );
      this.closeInAppNavigation();
      this.closeTaskDetails();
      await this.loadAllDashboardData();
      this.sendLocationFrame();
    } catch (err) {
      console.error('Failed to complete order:', err);
      alert('အော်ဒါ ပြီးစီးကြောင်း အတည်ပြုရာတွင် အမှားအယွင်းရှိနေပါသည်။');
    } finally {
      this.isCompletingOrder.set(false);
    }
  }

  // ==================== 5. REAL-TIME SSE NOTIFICATIONS ====================

  private startNotificationStream() {
    const token =
      (this.authService as any).getToken?.() ||
      localStorage.getItem('token');

    this.sseAbortController = this.riderService.connectNotificationStream(
      this.riderId(),
      token,
      (event) => {
        this.notifications.update((list) => [event, ...list]);
        this.unreadNotifCount.update((c) => c + 1);
        this.latestToast.set(event);

        if (event.type === 'NEW_TASK') {
          this.loadAllDashboardData();
        }

        setTimeout(() => {
          if (this.latestToast()?.orderId === event.orderId) {
            this.latestToast.set(null);
          }
        }, 8000);
      }
    );
  }

  toggleNotifDrawer() {
    this.isNotifDrawerOpen.update((v) => !v);
    if (this.isNotifDrawerOpen()) {
      this.unreadNotifCount.set(0);
    }
  }

  resolveImageUrl(img?: string | null): string {
    if (!img) return '';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}/images/${img}`;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
