import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DeliveryFeeConfigData {
  id?: string;
  baseDeliveryFee: number;
  deliveryFeePerKm: number;
  multiStopFee: number;
  roundingCeiling: number;
}

export interface UpdateDeliveryFeeConfigRequest {
  baseDeliveryFee: number;
  deliveryFeePerKm: number;
  multiStopFee: number;
  roundingCeiling: number;
}

@Injectable({
  providedIn: 'root',
})
export class DeliveryConfigService {
  private http = inject(HttpClient);
  private configUrl = `${environment.apiUrl}/admin/config`;

  /**
   * GET /api/admin/config
   * Returns { id: "MAIN_PRICING_CONFIG", baseDeliveryFee, deliveryFeePerKm, multiStopFee, roundingCeiling }
   */
  getDeliveryFeeConfig(): Observable<DeliveryFeeConfigData> {
    return this.http.get<DeliveryFeeConfigData>(this.configUrl);
  }

  /**
   * PUT /api/admin/config
   * Updates the active pricing configuration
   */
  updateDeliveryFeeConfig(
    payload: UpdateDeliveryFeeConfigRequest
  ): Observable<DeliveryFeeConfigData> {
    return this.http.put<DeliveryFeeConfigData>(this.configUrl, payload);
  }
}
