import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import {
  DeliveryConfigService,
  DeliveryFeeConfigData,
  UpdateDeliveryFeeConfigRequest,
} from '../../../core/services/delivery-config-service';

interface RouteScenario {
  label: string;
  route: string;
  distanceKm: number;
  stops: number;
}

@Component({
  selector: 'app-delivery-fee-config',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './delivery-fee-config.html',
  styleUrl: './delivery-fee-config.css',
})
export class DeliveryFeeConfig implements OnInit, OnDestroy {
  private configService = inject(DeliveryConfigService);

  // Loading & Submission State
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  saveSuccessMessage = signal<string>('');

  // Saved Server State (from GET /api/admin/config)
  savedConfig = signal<DeliveryFeeConfigData>({
    id: 'MAIN_PRICING_CONFIG',
    baseDeliveryFee: 1500,
    deliveryFeePerKm: 100,
    multiStopFee: 500,
    roundingCeiling: 50,
  });

  // Editable Form Signals
  formBaseFee = signal<number>(1500);
  formFeePerKm = signal<number>(100);
  formMultiStopFee = signal<number>(500);
  formRoundingCeiling = signal<number>(50);

  // Interactive Simulator Controls
  simDistanceKm = signal<number>(2.4);
  simRestaurantStops = signal<number>(1);

  readonly roundingPresets = [1, 10, 50, 100, 500];

  readonly sampleScenarios: RouteScenario[] = [
    {
      label: 'Short Ward Hop',
      route: 'MyinThar Ward → KanThar Lake',
      distanceKm: 1.4,
      stops: 1,
    },
    {
      label: 'Campus Delivery',
      route: 'Downtown → Magway University',
      distanceKm: 3.3,
      stops: 1,
    },
    {
      label: 'Multi-Restaurant Combo',
      route: '2 Restaurants → Pyi Taw Thar',
      distanceKm: 2.8,
      stops: 2,
    },
    {
      label: 'Long Cross-Town Group Order',
      route: '3 Restaurants → Aung Mingalar',
      distanceKm: 5.7,
      stops: 3,
    },
  ];

  private refreshListener = () => this.loadConfig();

  // Check if admin has modified any field compared to saved server values
  hasUnsavedChanges = computed(() => {
    const saved = this.savedConfig();
    return (
      Number(this.formBaseFee()) !== saved.baseDeliveryFee ||
      Number(this.formFeePerKm()) !== saved.deliveryFeePerKm ||
      Number(this.formMultiStopFee()) !== saved.multiStopFee ||
      Number(this.formRoundingCeiling()) !== saved.roundingCeiling
    );
  });

  // --- LIVE SIMULATOR CALCULATIONS (Using Form Values) ---

  simDistanceCharge = computed(
    () => this.simDistanceKm() * Number(this.formFeePerKm() || 0)
  );

  simExtraStopsCount = computed(() =>
    Math.max(0, Number(this.simRestaurantStops() || 1) - 1)
  );

  simMultiStopCharge = computed(
    () => this.simExtraStopsCount() * Number(this.formMultiStopFee() || 0)
  );

  simRawSubtotal = computed(
    () =>
      Number(this.formBaseFee() || 0) +
      this.simDistanceCharge() +
      this.simMultiStopCharge()
  );

  simRoundedFinalFee = computed(() =>
    this.calculateFee(
      this.simDistanceKm(),
      this.simRestaurantStops(),
      Number(this.formBaseFee() || 0),
      Number(this.formFeePerKm() || 0),
      Number(this.formMultiStopFee() || 0),
      Number(this.formRoundingCeiling() || 1)
    )
  );

  simRoundingAdjustment = computed(
    () => Math.max(0, this.simRoundedFinalFee() - this.simRawSubtotal())
  );

  // Compare with currently saved server config
  simSavedFinalFee = computed(() => {
    const s = this.savedConfig();
    return this.calculateFee(
      this.simDistanceKm(),
      this.simRestaurantStops(),
      s.baseDeliveryFee,
      s.deliveryFeePerKm,
      s.multiStopFee,
      s.roundingCeiling
    );
  });

  ngOnInit() {
    this.loadConfig();
    window.addEventListener('admin-manual-refresh', this.refreshListener);
  }

  ngOnDestroy() {
    window.removeEventListener('admin-manual-refresh', this.refreshListener);
  }

  async loadConfig() {
    this.isLoading.set(true);
    this.saveSuccessMessage.set('');
    try {
      const res: any = await lastValueFrom(this.configService.getDeliveryFeeConfig());
      // Support both raw object and ApiResponse wrapper just in case
      const config: DeliveryFeeConfigData = res?.data ? res.data : res;

      if (config) {
        this.applyConfigToState(config);
      }
    } catch (err) {
      console.error('Failed to fetch delivery fee config:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveConfig() {
    if (this.isSaving()) return;

    const payload: UpdateDeliveryFeeConfigRequest = {
      baseDeliveryFee: Number(this.formBaseFee()),
      deliveryFeePerKm: Number(this.formFeePerKm()),
      multiStopFee: Number(this.formMultiStopFee()),
      roundingCeiling: Number(this.formRoundingCeiling()),
    };

    if (
      payload.baseDeliveryFee < 0 ||
      payload.deliveryFeePerKm < 0 ||
      payload.multiStopFee < 0 ||
      payload.roundingCeiling <= 0
    ) {
      alert('All fees must be non-negative and Rounding Ceiling must be greater than 0.');
      return;
    }

    this.isSaving.set(true);
    this.saveSuccessMessage.set('');
    try {
      const res: any = await lastValueFrom(
        this.configService.updateDeliveryFeeConfig(payload)
      );
      const updated: DeliveryFeeConfigData = res?.data ? res.data : res;
      this.applyConfigToState(updated || { id: 'MAIN_PRICING_CONFIG', ...payload });

      this.saveSuccessMessage.set('Delivery pricing rules updated in production!');
      setTimeout(() => this.saveSuccessMessage.set(''), 4000);
    } catch (err) {
      console.error('Failed to update delivery fee config:', err);
      alert('Failed to update delivery fee config. Please check your connection.');
    } finally {
      this.isSaving.set(false);
    }
  }

  resetFormToSaved() {
    const saved = this.savedConfig();
    this.formBaseFee.set(saved.baseDeliveryFee);
    this.formFeePerKm.set(saved.deliveryFeePerKm);
    this.formMultiStopFee.set(saved.multiStopFee);
    this.formRoundingCeiling.set(saved.roundingCeiling);
  }

  adjustField(
    field: 'BASE' | 'KM' | 'STOP',
    delta: number
  ) {
    if (field === 'BASE') {
      this.formBaseFee.update((v) => Math.max(0, Number(v) + delta));
    } else if (field === 'KM') {
      this.formFeePerKm.update((v) => Math.max(0, Number(v) + delta));
    } else if (field === 'STOP') {
      this.formMultiStopFee.update((v) => Math.max(0, Number(v) + delta));
    }
  }

  calculateScenarioSavedFee(sc: RouteScenario): number {
    const s = this.savedConfig();
    return this.calculateFee(
      sc.distanceKm,
      sc.stops,
      s.baseDeliveryFee,
      s.deliveryFeePerKm,
      s.multiStopFee,
      s.roundingCeiling
    );
  }

  calculateScenarioDraftFee(sc: RouteScenario): number {
    return this.calculateFee(
      sc.distanceKm,
      sc.stops,
      Number(this.formBaseFee() || 0),
      Number(this.formFeePerKm() || 0),
      Number(this.formMultiStopFee() || 0),
      Number(this.formRoundingCeiling() || 1)
    );
  }

  private calculateFee(
    distanceKm: number,
    stops: number,
    baseFee: number,
    perKm: number,
    multiStop: number,
    ceiling: number
  ): number {
    const extraStops = Math.max(0, stops - 1);
    const raw = baseFee + distanceKm * perKm + extraStops * multiStop;
    if (!ceiling || ceiling <= 1) return Math.round(raw);
    return Math.ceil(raw / ceiling) * ceiling;
  }

  private applyConfigToState(config: DeliveryFeeConfigData) {
    this.savedConfig.set({
      id: config.id || 'MAIN_PRICING_CONFIG',
      baseDeliveryFee: Number(config.baseDeliveryFee ?? 1500),
      deliveryFeePerKm: Number(config.deliveryFeePerKm ?? 100),
      multiStopFee: Number(config.multiStopFee ?? 500),
      roundingCeiling: Number(config.roundingCeiling ?? 50),
    });
    this.resetFormToSaved();
  }
}
