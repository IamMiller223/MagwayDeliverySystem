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
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import * as L from 'leaflet';
import {
  CreateRiderRequest,
  RiderProfile,
  RiderService,
  RiderSummary,
  UpdateRiderProfileRequest,
  UpdateRiderVehicleRequest,
} from '../../../core/services/rider-service';
import { environment } from '../../../../environments/environment';

interface NrcStateOption {
  code: string;
  label: string;
  townships: string[];
}

export interface RiderLiveGps {
  riderId: string;
  latitude: number;
  longitude: number;
  status: string;
  updatedAt: Date;
}

@Component({
  selector: 'app-riders-fleet',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe, SlicePipe, UpperCasePipe],
  templateUrl: './riders-fleet.html',
  styleUrl: './riders-fleet.css',
})
export class RidersFleet implements OnInit, OnDestroy {
  private riderService = inject(RiderService);

  @ViewChild('fleetMapContainer', { static: false })
  fleetMapElement!: ElementRef<HTMLDivElement>;

  // Master List State
  isLoadingRiders = signal<boolean>(true);
  riders = signal<RiderSummary[]>([]);
  statusFilter = signal<'ALL' | 'AVAILABLE' | 'BUSY'>('ALL');
  searchQuery = signal<string>('');

  // Selected Rider Profile State
  selectedRiderId = signal<string | null>(null);
  isLoadingProfile = signal<boolean>(false);
  selectedProfile = signal<RiderProfile | null>(null);

  // Dedicated Tracking Map Modal State
  isMapModalOpen = signal<boolean>(false);
  wsConnected = signal<boolean>(false);
  liveLocations = signal<Record<string, RiderLiveGps>>({});
  private ws: WebSocket | null = null;
  private map: L.Map | null = null;
  private riderMarkers: Record<string, L.Marker> = {};

  // Create / Edit Profile Drawer State
  isProfileDrawerOpen = signal<boolean>(false);
  isEditingProfile = signal<boolean>(false);
  isSubmittingProfile = signal<boolean>(false);
  isUploadingImage = signal<boolean>(false);

  formName = signal<string>('');
  formPhone = signal<string>('09');
  formEmail = signal<string>('');
  formPassword = signal<string>('');
  formImage = signal<string>('');
  formVehicleType = signal<string>('Scooter');
  formLicenceNumber = signal<string>('မကွေး-');

  // Interactive Myanmar NRC Builder State
  nrcMode = signal<'BUILDER' | 'CUSTOM'>('BUILDER');
  nrcState = signal<string>('၈');
  nrcTownship = signal<string>('မကန');
  nrcCustomTownship = signal<string>('');
  nrcCitizenType = signal<string>('နိုင်');
  nrcDigits = signal<string>('');
  customNrcString = signal<string>('');

  // Dedicated Vehicle Update Drawer State
  isVehicleDrawerOpen = signal<boolean>(false);
  isSubmittingVehicle = signal<boolean>(false);
  vehicleFormType = signal<string>('Scooter');
  vehicleFormLicence = signal<string>('');

  readonly vehicleTypes = ['Scooter', 'Motorcycle', 'Car', 'Bicycle', 'EV Scooter'];

  readonly licencePresets = [
    'MGW-', 'မကွေး-',
    'YGN-', 'MDY-', 'NPW-', 'BGO-', 'SGG-', 'AYW-',
    'MON-', 'SHN-', 'KYN-', 'KCH-', 'KAH-', 'CHN-', 'RKE-',
    'ရန်ကုန်-', 'မန္တလေး-', 'နေပြည်တော်-',
    '၁၂ယ/', '၁က/', '၉ခ/', '၆ဆ/', '၂ခ/', '၃ည/',
  ];

  readonly nrcCitizenTypes = [
    { value: 'နိုင်', label: '(နိုင်) နိုင်ငံသား' },
    { value: 'ပြု', label: '(ပြု) နိုင်ငံသားပြုခွင့်ရသူ' },

  ];

  readonly nrcStateOptions: NrcStateOption[] = [
    { code: '၁', label: '၁/ ကချင်ပြည်နယ်', townships: ['မကန', 'ဗမန', 'ဖကန', 'မညန', 'ပတအ'] },
    { code: '၂', label: '၂/ ကယားပြည်နယ်', townships: ['လကန', 'ဒမဆ', 'ဖဆန', 'ဘလခ'] },
    { code: '၃', label: '၃/ ကရင်ပြည်နယ်', townships: ['ဘအန', 'မဝတ', 'ကကရ', 'လဘန'] },
    { code: '၄', label: '၄/ ချင်းပြည်နယ်', townships: ['ဟခန', 'ဖလန', 'တတန', 'မတပ'] },
    { code: '၅', label: '၅/ စစ်ကိုင်းတိုင်း', townships: ['မရန', 'စကန', 'ရဘန', 'ကလန', 'မကန'] },
    { code: '၆', label: '၆/ တနင်္သာရီတိုင်း', townships: ['ထဝန', 'မမန', 'ကသန', 'ပလန'] },
    { code: '၇', label: '၇/ ပဲခူးတိုင်း', townships: ['ပခန', 'ပြည်', 'တငန', 'သနပ', 'ဒဥန'] },
    {
      code: '၈',
      label: '၈/ မကွေးတိုင်းဒေသကြီး',
      townships: [
        'မကန', 'ရနခ', 'ချောက်', 'ပခက', 'တတက', 'မဘန', 'မလန', 'အလန',
        'သရက', 'ဂဂန', 'ပဖန', 'စလန', 'ရစက', 'နမန', 'မသန', 'ဆဖန', 'ငဖန',
      ],
    },
    { code: '၉', label: '၉/ မန္တလေးတိုင်း', townships: ['မအမ', 'အမဇ', 'ချမ်းအေး', 'မထလ', 'ပဥလ', 'ညဥန'] },
    { code: '၁၀', label: '၁၀/ မွန်ပြည်နယ်', townships: ['မလမ', 'သထန', 'ကမရ', 'မဒန', 'ရမန'] },
    { code: '၁၁', label: '၁၁/ ရခိုင်ပြည်နယ်', townships: ['စတန', 'မဥန', 'သတန', 'ကဖန'] },
    { code: '၁၂', label: '၁၂/ ရန်ကုန်တိုင်း', townships: ['ကမရ', 'စခန', 'မရက', 'သဃက', 'အစန', 'လမန'] },
    { code: '၁၃', label: '၁၃/ ရှမ်းပြည်နယ်', townships: ['တကန', 'လရန', 'ကတန', 'ဖပန', 'မဆန'] },
    { code: '၁၄', label: '၁၄/ ဧရာဝတီတိုင်း', townships: ['ပသန', 'ဟသတ', 'မအပ', 'ဖပန', 'မြောင်းမြ'] },
  ];

  private refreshListener = () => this.loadAllRiders();

  // --- COMPUTED METRICS & VALIDATIONS ---

  availableCount = computed(
    () => this.riders().filter((r) => r.status === 'AVAILABLE').length
  );

  busyCount = computed(
    () => this.riders().filter((r) => r.status === 'BUSY').length
  );

  filteredRiders = computed(() => {
    const status = this.statusFilter();
    const q = this.searchQuery().trim().toLowerCase();

    return this.riders().filter((r) => {
      const matchesStatus = status === 'ALL' || r.status === status;
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.riderId.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  });

  selectedRiderGps = computed<RiderLiveGps | null>(() => {
    const id = this.selectedRiderId();
    if (!id) return null;
    return this.liveLocations()[id] || null;
  });

  liveGpsList = computed(() => Object.values(this.liveLocations()));

  currentTownshipOptions = computed(() => {
    const st = this.nrcStateOptions.find((s) => s.code === this.nrcState());
    return st ? st.townships : ['မကန'];
  });

  computedNrcNumber = computed(() => {
    if (this.nrcMode() === 'CUSTOM') {
      return this.customNrcString().trim();
    }
    const state = this.nrcState();
    const township = (this.nrcCustomTownship().trim() || this.nrcTownship()).trim();
    const citizen = this.nrcCitizenType();
    const digits = this.toMyanmarDigits(this.nrcDigits().trim());
    return `${state}/${township}(${citizen})${digits}`;
  });

  isNrcValid = computed(() => {
    const value = this.computedNrcNumber();
    const myanmarNrcRegex = /^([၁-၉]|၁[၀-၄])\/[က-အဣ-ဧဦါ-ှ်]{2,10}\((နိုင်|ဧည့်|ပြု|သာ|သီ)\)[၀-၉]{6}$/;
    const englishNrcRegex = /^([1-9]|1[0-4])\/[A-Za-z]{3,12}\((N|E|P|T|TH)\)\d{6}$/i;
    return myanmarNrcRegex.test(value) || englishNrcRegex.test(value);
  });

  isCreateLicenceValid = computed(() =>
    this.validateMyanmarLicencePlate(this.formLicenceNumber())
  );

  isEditLicenceValid = computed(() =>
    this.validateMyanmarLicencePlate(this.vehicleFormLicence())
  );

  ngOnInit() {
    this.loadAllRiders();
    this.connectRiderLocationSocket();
    window.addEventListener('admin-manual-refresh', this.refreshListener);
  }

  ngOnDestroy() {
    window.removeEventListener('admin-manual-refresh', this.refreshListener);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.destroyFleetMap();
  }

  // ==================== 1. FETCH RIDERS & PROFILE ====================

  async loadAllRiders() {
    this.isLoadingRiders.set(true);
    try {
      const res = await lastValueFrom(this.riderService.getAllRiders());
      const list = res?.data || [];
      this.riders.set(list);

      if (!this.selectedRiderId() && list.length > 0) {
        this.selectRider(list[0].riderId);
      } else if (this.selectedRiderId()) {
        this.selectRider(this.selectedRiderId()!);
      }
    } catch (err) {
      console.error('Failed to load riders:', err);
    } finally {
      this.isLoadingRiders.set(false);
    }
  }

  async selectRider(riderId: string) {
    this.selectedRiderId.set(riderId);
    this.isLoadingProfile.set(true);

    try {
      const res = await lastValueFrom(this.riderService.getRiderProfile(riderId));
      if (res?.data) {
        this.selectedProfile.set(res.data);
      }
    } catch (err) {
      console.error('Failed to load rider profile:', err);
    } finally {
      this.isLoadingProfile.set(false);
    }
  }

  hasLiveGps(riderId: string): boolean {
    return !!this.liveLocations()[riderId];
  }

  getRiderNameById(riderId: string): string {
    if (this.selectedProfile()?.userId === riderId) {
      return this.selectedProfile()!.name;
    }
    return this.riders().find((r) => r.riderId === riderId)?.name || `#${riderId.slice(-5).toUpperCase()}`;
  }

  // ==================== 2. DEDICATED TRACKING MAP MODAL ====================

  openTrackRiderModal(riderId?: string, event?: MouseEvent) {
    event?.stopPropagation();
    if (riderId && riderId !== this.selectedRiderId()) {
      this.selectRider(riderId);
    }

    this.isMapModalOpen.set(true);
    setTimeout(() => {
      this.initFleetMap();
      const targetId = riderId || this.selectedRiderId();
      if (targetId && this.liveLocations()[targetId]) {
        this.focusRiderOnMap(targetId);
      } else {
        this.fitAllRidersOnMap();
      }
    }, 120);
  }

  closeTrackRiderModal() {
    this.isMapModalOpen.set(false);
    this.destroyFleetMap();
  }

  private initFleetMap() {
    this.destroyFleetMap();
    if (!this.fleetMapElement?.nativeElement) return;

    this.map = L.map(this.fleetMapElement.nativeElement).setView([20.1495, 94.932], 14);

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

    Object.values(this.liveLocations()).forEach((gps) =>
      this.updateRiderMarkerOnMap(gps)
    );

    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  private destroyFleetMap() {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.riderMarkers = {};
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
          if (
            payload?.riderId &&
            payload.latitude != null &&
            payload.longitude != null
          ) {
            const normalizedStatus = String(payload.status || 'AVAILABLE').toUpperCase();
            const gps: RiderLiveGps = {
              riderId: payload.riderId,
              latitude: Number(payload.latitude),
              longitude: Number(payload.longitude),
              status: normalizedStatus,
              updatedAt: new Date(),
            };

            this.liveLocations.update((prev) => ({
              ...prev,
              [gps.riderId]: gps,
            }));

            this.riders.update((list) =>
              list.map((r) =>
                r.riderId === gps.riderId ? { ...r, status: normalizedStatus } : r
              )
            );
            if (this.selectedProfile()?.userId === gps.riderId) {
              this.selectedProfile.update((p) =>
                p ? { ...p, status: normalizedStatus } : null
              );
            }

            if (this.isMapModalOpen()) {
              this.updateRiderMarkerOnMap(gps);
            }
          }
        } catch {
          // Ignore non-JSON frames
        }
      };
    } catch (err) {
      console.warn('WebSocket connection error:', err);
    }
  }

  private updateRiderMarkerOnMap(gps: RiderLiveGps) {
    if (!this.map) return;

    const isSelected = this.selectedRiderId() === gps.riderId;
    const riderName = this.getRiderNameById(gps.riderId);

    const licencePlate =
      isSelected && this.selectedProfile()?.vehicle?.licenceNumber
        ? ` • ${this.selectedProfile()!.vehicle!.licenceNumber}`
        : '';

    const isAvail = gps.status === 'AVAILABLE';
    const bg = isSelected ? '#2563eb' : isAvail ? '#059669' : '#ea580c';
    const ring = isSelected ? '0 0 0 4px rgba(37, 99, 235, 0.35)' : '0 4px 10px rgba(0,0,0,0.25)';

    const icon = L.divIcon({
      className: 'fleet-rider-pin',
      html: `
        <div style="
          background:${bg};
          color:#ffffff;
          padding:5px 11px;
          border-radius:999px;
          font-weight:800;
          font-size:11px;
          border:2px solid #ffffff;
          box-shadow:${ring};
          white-space:nowrap;
          display:inline-flex;
          align-items:center;
          gap:5px;
        ">
          <span>🛵 ${riderName}${licencePlate}</span>
        </div>
      `,
      iconSize: [140, 30],
      iconAnchor: [70, 15],
    });

    const popupHtml = `
      <div style="font-family:sans-serif;min-width:165px;">
        <strong style="font-size:13px;color:#0f172a;">${riderName}</strong><br/>
        <span style="font-size:11px;color:#475569;">Status: <b>${gps.status}</b></span><br/>
        <span style="font-size:11px;color:#64748b;">GPS: ${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}</span>
      </div>
    `;

    if (this.riderMarkers[gps.riderId]) {
      this.riderMarkers[gps.riderId].setLatLng([gps.latitude, gps.longitude]);
      this.riderMarkers[gps.riderId].setIcon(icon);
      this.riderMarkers[gps.riderId].setPopupContent(popupHtml);
    } else {
      const marker = L.marker([gps.latitude, gps.longitude], { icon })
        .addTo(this.map)
        .bindPopup(popupHtml);

      marker.on('click', () => {
        this.selectRider(gps.riderId);
        this.focusRiderOnMap(gps.riderId);
      });

      this.riderMarkers[gps.riderId] = marker;
    }
  }

  focusRiderOnMap(riderId: string | null = this.selectedRiderId()) {
    if (!this.map || !riderId) return;

    if (this.selectedRiderId() !== riderId) {
      this.selectRider(riderId);
    }

    Object.values(this.liveLocations()).forEach((g) => this.updateRiderMarkerOnMap(g));

    const gps = this.liveLocations()[riderId];
    if (gps) {
      this.map.flyTo([gps.latitude, gps.longitude], 16, { duration: 0.6 });
      this.riderMarkers[riderId]?.openPopup();
    }
  }

  fitAllRidersOnMap() {
    if (!this.map) return;
    const coords = Object.values(this.liveLocations()).map(
      (g) => [g.latitude, g.longitude] as [number, number]
    );
    if (coords.length > 0) {
      this.map.fitBounds(coords, { padding: [50, 50], maxZoom: 16 });
    } else {
      this.map.setView([20.1495, 94.932], 14);
    }
  }

  // ==================== 3. NRC & LICENCE HELPERS ====================

  onNrcStateChange(newStateCode: string) {
    this.nrcState.set(newStateCode);
    const found = this.nrcStateOptions.find((s) => s.code === newStateCode);
    if (found && found.townships.length > 0) {
      this.nrcTownship.set(found.townships[0]);
      this.nrcCustomTownship.set('');
    }
  }

  onNrcDigitsInput(raw: string) {
    const converted = this.toMyanmarDigits(raw).replace(/[^၀-၉]/g, '').slice(0, 6);
    this.nrcDigits.set(converted);
  }

  toMyanmarDigits(input: string): string {
    const map: Record<string, string> = {
      '0': '၀', '1': '၁', '2': '၂', '3': '၃', '4': '၄',
      '5': '၅', '6': '၆', '7': '၇', '8': '၈', '9': '၉',
    };
    return input.replace(/[0-9]/g, (d) => map[d] || d);
  }

  validateMyanmarLicencePlate(plate: string): boolean {
    const cleaned = plate.trim();
    if (!cleaned) return false;
    const mmPlateRegex = /^[က-အ၀-၉]{1,12}[-/][၀-၉]{3,5}$/;
    const enPlateRegex = /^[A-Za-z0-9]{1,6}[-/]\d{3,5}$/;
    return mmPlateRegex.test(cleaned) || enPlateRegex.test(cleaned);
  }

  private parseExistingNrcIntoBuilder(nrc: string) {
    const mmMatch = nrc.match(
      /^([၁-၉]|၁[၀-၄])\/([က-အဣ-ဧဦါ-ှ်]+)\((နိုင်|ဧည့်|ပြု|သာ|သီ)\)([၀-၉]{6})$/
    );
    if (mmMatch) {
      this.nrcMode.set('BUILDER');
      this.nrcState.set(mmMatch[1]);
      const st = this.nrcStateOptions.find((s) => s.code === mmMatch[1]);
      if (st?.townships.includes(mmMatch[2])) {
        this.nrcTownship.set(mmMatch[2]);
        this.nrcCustomTownship.set('');
      } else {
        this.nrcCustomTownship.set(mmMatch[2]);
      }
      this.nrcCitizenType.set(mmMatch[3]);
      this.nrcDigits.set(mmMatch[4]);
    } else {
      this.nrcMode.set('CUSTOM');
      this.customNrcString.set(nrc || '');
    }
  }

  // ==================== 4. CREATE & UPDATE RIDER PROFILE ====================

  openCreateRiderDrawer() {
    this.isEditingProfile.set(false);
    this.formName.set('');
    this.formPhone.set('09');
    this.formEmail.set('');
    this.formPassword.set('');
    this.formImage.set('');
    this.formVehicleType.set('Scooter');
    this.formLicenceNumber.set('မကွေး-');

    this.nrcMode.set('BUILDER');
    this.nrcState.set('၈');
    this.nrcTownship.set('မကန');
    this.nrcCustomTownship.set('');
    this.nrcCitizenType.set('နိုင်');
    this.nrcDigits.set('');
    this.customNrcString.set('');

    this.isProfileDrawerOpen.set(true);
  }

  openEditProfileDrawer() {
    const profile = this.selectedProfile();
    if (!profile) return;

    this.isEditingProfile.set(true);
    this.formName.set(profile.name);
    this.formPhone.set(profile.phone);
    this.formEmail.set(profile.email);
    this.formImage.set(profile.image || '');
    this.parseExistingNrcIntoBuilder(profile.nrcNumber || '');

    this.isProfileDrawerOpen.set(true);
  }

  closeProfileDrawer() {
    this.isProfileDrawerOpen.set(false);
  }

  async onRiderImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploadingImage.set(true);
    try {
      const filename = await lastValueFrom(this.riderService.uploadImage(file));
      this.formImage.set(filename.trim());
    } catch (err) {
      console.error('Failed to upload rider photo:', err);
      alert('Rider ပုံတင်ခြင်း မအောင်မြင်ပါ။');
    } finally {
      this.isUploadingImage.set(false);
    }
  }

  async saveRiderProfile() {
    if (this.isSubmittingProfile()) return;

    const finalNrc = this.computedNrcNumber();
    if (!this.isNrcValid()) {
      alert(
        'ကျေးဇူးပြု၍ မြန်မာနိုင်ငံသားစိစစ်ရေးကတ်ပြားအမှတ် (ဥပမာ - ၈/မကန(နိုင်)၁၂၃၄၅၆ သို့မဟုတ် 8/MAGAWA(N)123456) ကို မှန်ကန်စွာ ဖြည့်သွင်းပါ။'
      );
      return;
    }

    const phoneClean = this.formPhone().trim();
    if (!/^(?:\+959|09)\d{7,9}$/.test(phoneClean)) {
      alert('မြန်မာဖုန်းနံပါတ် ပုံစံမှန်ကန်စွာ ဖြည့်သွင်းပါ (ဥပမာ - 09... သို့မဟုတ် +959...)။');
      return;
    }

    this.isSubmittingProfile.set(true);
    try {
      if (this.isEditingProfile() && this.selectedProfile()) {
        const riderId = this.selectedProfile()!.userId;
        const updatePayload: UpdateRiderProfileRequest = {
          name: this.formName().trim(),
          phone: phoneClean,
          image: this.formImage().trim() || null,
          nrcNumber: finalNrc,
        };

        await lastValueFrom(this.riderService.updateRiderProfile(riderId, updatePayload));
        await this.loadAllRiders();
        await this.selectRider(riderId);
      } else {
        if (!this.isCreateLicenceValid()) {
          alert(
            'ယာဉ်လိုင်စင်နံပါတ်ကို မြန်မာစံနှုန်းအတိုင်း ဖြည့်သွင်းပါ (ဥပမာ - မကွေး-၉၂၈၈၊ ၁၂ယ/၁၂၃၄၅ သို့မဟုတ် MGW-9288)။'
          );
          this.isSubmittingProfile.set(false);
          return;
        }

        const createPayload: CreateRiderRequest = {
          name: this.formName().trim(),
          phone: phoneClean,
          email: this.formEmail().trim(),
          password: this.formPassword(),
          image: this.formImage().trim(),
          nrcNumber: finalNrc,
          vehicleType: this.formVehicleType(),
          licenceNumber: this.formLicenceNumber().trim(),
        };

        const res = await lastValueFrom(this.riderService.createRider(createPayload));
        await this.loadAllRiders();
        if (res?.data?.userId) {
          await this.selectRider(res.data.userId);
        }
      }

      this.closeProfileDrawer();
    } catch (err: any) {
      console.error('Failed to save rider:', err);
      alert(err?.error?.message || 'Rider အချက်အလက် သိမ်းဆည်းခြင်း မအောင်မြင်ပါ။');
    } finally {
      this.isSubmittingProfile.set(false);
    }
  }

  // ==================== 5. UPDATE RIDER VEHICLE ====================

  openVehicleDrawer() {
    const profile = this.selectedProfile();
    if (!profile) return;

    this.vehicleFormType.set(profile.vehicle?.type || 'Scooter');
    this.vehicleFormLicence.set(profile.vehicle?.licenceNumber || 'မကွေး-');
    this.isVehicleDrawerOpen.set(true);
  }

  closeVehicleDrawer() {
    this.isVehicleDrawerOpen.set(false);
  }

  async saveRiderVehicle() {
    const profile = this.selectedProfile();
    if (!profile || this.isSubmittingVehicle()) return;

    if (!this.isEditLicenceValid()) {
      alert(
        'ယာဉ်လိုင်စင်နံပါတ်ကို မြန်မာစံနှုန်းအတိုင်း ဖြည့်သွင်းပါ (ဥပမာ - မကွေး-၉၂၈၈၊ ၁၂ယ/၁၂၃၄၅ သို့မဟုတ် MGW-9288)။'
      );
      return;
    }

    this.isSubmittingVehicle.set(true);
    try {
      const payload: UpdateRiderVehicleRequest = {
        type: this.vehicleFormType(),
        licenceNumber: this.vehicleFormLicence().trim(),
      };

      const res = await lastValueFrom(
        this.riderService.updateRiderVehicle(profile.userId, payload)
      );
      if (res?.data) {
        this.selectedProfile.update((p) =>
          p ? { ...p, vehicle: res.data } : null
        );
      }
      this.closeVehicleDrawer();
    } catch (err) {
      console.error('Failed to update vehicle:', err);
      alert('ယာဉ်အချက်အလက် ပြင်ဆင်ခြင်း မအောင်မြင်ပါ။');
    } finally {
      this.isSubmittingVehicle.set(false);
    }
  }

  // ==================== 6. DELETE RIDER ====================

  async confirmDeleteRider(riderId: string, riderName: string, event?: MouseEvent) {
    event?.stopPropagation();
    if (!confirm(`Rider "${riderName}" ကို စနစ်မှ အပြီးတိုင် ဖယ်ရှားရန် သေချာပါသလား?`)) return;

    try {
      await lastValueFrom(this.riderService.deleteRider(riderId));
      this.riders.update((list) => list.filter((r) => r.riderId !== riderId));

      if (this.selectedRiderId() === riderId) {
        const remaining = this.riders();
        if (remaining.length > 0) {
          this.selectRider(remaining[0].riderId);
        } else {
          this.selectedRiderId.set(null);
          this.selectedProfile.set(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete rider:', err);
      alert('Rider ဖယ်ရှားခြင်း မအောင်မြင်ပါ။');
    }
  }

  resolveImageUrl(img?: string | null): string {
    if (!img) return '';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}/images/${img}`;
  }
}
