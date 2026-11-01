import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../../environments/environment';

export type RiderStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE' | string;

// ==================== ADMIN & SHARED MODELS ====================

export interface RiderSummary {
  riderId: string;
  name: string;
  phone: string;
  status: RiderStatus;
}

export interface RiderVehicle {
  id: string;
  riderId: string;
  type: string;
  licenceNumber: string;
  createdAt: string;
}

export interface RiderProfile {
  userId: string;
  name: string;
  email: string;
  phone: string;
  image: string | null;
  role: string;
  status: RiderStatus;
  nrcNumber: string;
  vehicle: RiderVehicle | null;
}

export interface CreateRiderRequest {
  name: string;
  phone: string;
  email: string;
  password: string;
  image: string;
  nrcNumber: string;
  vehicleType: string;
  licenceNumber: string;
}

export interface UpdateRiderProfileRequest {
  name: string;
  phone: string;
  image: string | null;
  nrcNumber: string;
}

export interface UpdatedRiderProfileData {
  riderId: string;
  image: string | null;
  name: string;
  phone: string;
  email: string;
  nrcNumber: string;
}

export interface UpdateRiderVehicleRequest {
  type: string;
  licenceNumber: string;
}

// ==================== RIDER APP MODELS ====================

// GET /api/rider/{riderId}/stats
export interface RiderStats {
  activeCount: number;
  completedCount: number;
}

// GET /api/rider/{riderId}/tasks?type=active | completed
export interface RiderTaskSummary {
  orderId: string;
  status: 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'PREPARING' | string;
  deliveryAddress: string;
  customerName: string;
  itemCount: number;
  totalAmount: number;
  createdAt: string;
}

// GET /api/rider/order/{orderId}/details
export interface RiderPickupLocation {
  restaurantName: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface RiderOrderRecipient {
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
  image: string | null;
}

export interface RiderReceiptItem {
  quantity: number;
  name: string;
  price: number;
}

export interface RiderOrderDetails {
  orderId: string;
  status: string;
  createdAt: string;
  pickupLocations: RiderPickupLocation[];
  deliveryDestinationAddress: string;
  recipient: RiderOrderRecipient;
  receiptSummary: RiderReceiptItem[];
  totalCashCollect: number;
  itemsTotal: number;
  deliveryFee: number;
  totalDistanceKm: number;
  extraStops: number;
}

// GET /api/rider/{riderId}/notifications (SSE)
export interface RiderNotificationEvent {
  riderId: string;
  orderId: string;
  type: 'NEW_TASK' | string;
  message: string;
  createdAt: string;
}

// ws://localhost:8080/ws/rider-location
export interface RiderLocationWsPayload {
  riderId: string;
  latitude: number;
  longitude: number;
  status: 'AVAILABLE' | 'BUSY' | string;
}

@Injectable({
  providedIn: 'root',
})
export class RiderService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/rider`;
  private imageUploadUrl = `${environment.apiUrl}/images/upload`;

  // ==================== ADMIN OPERATIONS ====================

  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(this.imageUploadUrl, formData, {
      responseType: 'text',
    });
  }

  getAllRiders(): Observable<ApiResponse<RiderSummary[]>> {
    return this.http.get<ApiResponse<RiderSummary[]>>(this.baseUrl);
  }

  getRiderProfile(riderId: string): Observable<ApiResponse<RiderProfile>> {
    return this.http.get<ApiResponse<RiderProfile>>(
      `${this.baseUrl}/${riderId}/profile`
    );
  }

  createRider(payload: CreateRiderRequest): Observable<ApiResponse<RiderProfile>> {
    return this.http.post<ApiResponse<RiderProfile>>(this.baseUrl, payload);
  }

  updateRiderProfile(
    riderId: string,
    payload: UpdateRiderProfileRequest
  ): Observable<ApiResponse<UpdatedRiderProfileData>> {
    return this.http.put<ApiResponse<UpdatedRiderProfileData>>(
      `${this.baseUrl}/${riderId}`,
      payload
    );
  }

  updateRiderVehicle(
    riderId: string,
    payload: UpdateRiderVehicleRequest
  ): Observable<ApiResponse<RiderVehicle>> {
    return this.http.put<ApiResponse<RiderVehicle>>(
      `${this.baseUrl}/${riderId}/vehicle`,
      payload
    );
  }

  deleteRider(riderId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${riderId}`);
  }

  // ==================== RIDER APP OPERATIONS ====================

  /**
   * GET /api/rider/{riderId}/stats
   * Returns { activeCount, completedCount }
   */
  getRiderStats(riderId: string): Observable<RiderStats> {
    return this.http.get<RiderStats>(`${this.baseUrl}/${riderId}/stats`);
  }

  /**
   * GET /api/rider/{riderId}/tasks?type=active | completed
   */
  getRiderTasks(
    riderId: string,
    type: 'active' | 'completed'
  ): Observable<RiderTaskSummary[]> {
    const params = new HttpParams().set('type', type);
    return this.http.get<RiderTaskSummary[]>(
      `${this.baseUrl}/${riderId}/tasks`,
      { params }
    );
  }

  /**
   * GET /api/rider/order/{orderId}/details
   */
  getRiderOrderDetails(orderId: string): Observable<RiderOrderDetails> {
    return this.http.get<RiderOrderDetails>(
      `${this.baseUrl}/order/${orderId}/details`
    );
  }

  /**
   * PUT completeOrder
   * Note: Adjust URL path if your backend uses a different path for completing an order
   */
  completeOrder(riderId: string, orderId: string): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/${riderId}/orders/${orderId}/complete`,
      {}
    );
  }

  /**
   * GET /api/rider/{riderId}/notifications
   * Connects to the Server-Sent Events (SSE) stream with Bearer Token support
   */
  connectNotificationStream(
    riderId: string,
    token: string | null,
    onNotification: (event: RiderNotificationEvent) => void
  ): AbortController {
    const abortController = new AbortController();
    const url = `${this.baseUrl}/${riderId}/notifications`;

    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(url, {
      method: 'GET',
      headers,
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.replace(/^data:\s*/, '');
              if (jsonStr) {
                try {
                  const parsed: RiderNotificationEvent = JSON.parse(jsonStr);
                  onNotification(parsed);
                } catch {
                  // Ignore non-JSON heartbeat lines
                }
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Rider SSE notification stream closed:', err);
        }
      });

    return abortController;
  }
}
