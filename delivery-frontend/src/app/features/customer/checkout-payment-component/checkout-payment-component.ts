import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../../core/services/cart-service';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/AuthService';
import { environment } from '../../../../environments/environment';

interface DeliveryConfig {
  baseDeliveryFee: number;
  deliveryFeePerKm: number;
  multiStopFee: number;
  roundingCeiling: number;
}

interface RestaurantLocationData {
  id: string;
  lat: number;
  lon: number;
}

@Component({
  selector: 'app-checkout-payment-component',
  imports: [
    DecimalPipe,
    CommonModule,
    FormsModule
  ],
  templateUrl: './checkout-payment-component.html',
  styleUrl: './checkout-payment-component.css',
})
export class CheckoutPaymentComponent implements OnInit {
  router = inject(Router);
  cartService = inject(CartService);
  http = inject(HttpClient);
  authService = inject(AuthService);

  locationData: any = null;
  userId: string | null = null;

  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  isSubmitting = signal<boolean>(false);
  showSuccessModal = signal<boolean>(false);

  // Delivery Pricing Config & Calculation Signals
  config = signal<DeliveryConfig>({
    baseDeliveryFee: 1500.0,
    deliveryFeePerKm: 100.0,
    multiStopFee: 500.0,
    roundingCeiling: 50.0
  });

  restaurantLocations = signal<RestaurantLocationData[]>([]);
  isLoadingConfig = signal<boolean>(true);

  ngOnInit() {
    const user = this.authService.currentUser();
    if (!user || !user.userId) {
      console.warn("Unauthorized access detected. Redirecting to login.");
      this.router.navigate(['/login']);
      return;
    }

    this.userId = user.userId;

    // Verify location data was passed from step 1
    this.locationData = history.state.locationData;
    if (!this.locationData) {
      this.router.navigate(['/customer/checkout']);
      return;
    }

    this.loadPricingConfigAndRestaurants();
  }

  async loadPricingConfigAndRestaurants() {
    try {
      this.isLoadingConfig.set(true);

      // 1. Fetch live pricing config from backend
      try {
        const configRes: any = await lastValueFrom(
          this.http.get(`${environment.apiUrl}/admin/config`)
        );
        const configData = configRes.data ? configRes.data : configRes;
        if (configData && configData.baseDeliveryFee !== undefined) {
          this.config.set(configData);
        }
      } catch (e) {
        console.warn("Using default delivery config fallback.", e);
      }

      // 2. Extract unique restaurant IDs from cart items and fetch their coordinates
      const uniqueRestIds = [...new Set(this.cartService.cartItems().map(item => item.restaurantId))];
      const restLocations: RestaurantLocationData[] = [];

      for (const restId of uniqueRestIds) {
        try {
          const response: any = await lastValueFrom(
            this.http.get(`${environment.apiUrl}/restaurants/getRestaurantByID/${restId}`)
          );

          const rest = response.data ? response.data : response;

          if (rest && rest.latitude !== undefined && rest.longitude !== undefined) {
            restLocations.push({
              id: restId,
              lat: Number(rest.latitude),
              lon: Number(rest.longitude)
            });
          } else {
            console.warn(`Restaurant ${restId} is missing latitude/longitude in DB:`, rest);
          }
        } catch (err) {
          console.error(`Could not fetch coordinates for restaurant ID: ${restId}`, err);
        }
      }

      this.restaurantLocations.set(restLocations);
    } catch (error) {
      console.error("Failed to load calculation parameters", error);
    } finally {
      this.isLoadingConfig.set(false);
    }
  }

  // Force customer coordinates to be Numbers before math calculations
  totalDistanceKm = computed(() => {
    if (!this.locationData || this.restaurantLocations().length === 0) return 0.0;

    let sumDistance = 0;
    const userLat = Number(this.locationData.latitude);
    const userLon = Number(this.locationData.longitude);

    for (const rest of this.restaurantLocations()) {
      sumDistance += this.calculateHaversineDistance(userLat, userLon, rest.lat, rest.lon);
    }
    return sumDistance;
  });

  // --- CALCULATIONS (Mirroring Backend createOrderV2) ---

  get foodTotal(): number {
    return this.cartService.totalPrice();
  }


  uniqueRestaurantsCount = computed(() => {
    return new Set(this.cartService.cartItems().map(item => item.restaurantId)).size;
  });

  distanceFee = computed(() => {
    return this.totalDistanceKm() * this.config().deliveryFeePerKm;
  });

  multiStopFeeTotal = computed(() => {
    const count = this.uniqueRestaurantsCount();
    if (count > 1) {
      return (count - 1) * this.config().multiStopFee;
    }
    return 0;
  });

  calculatedDeliveryFee = computed(() => {
    const cfg = this.config();
    let fee = cfg.baseDeliveryFee + this.distanceFee() + this.multiStopFeeTotal();

    // Apply dynamic ceiling rounding
    const ceiling = cfg.roundingCeiling > 0 ? cfg.roundingCeiling : 50;
    return Math.ceil(fee / ceiling) * ceiling;
  });

  overallTotal = computed(() => {
    return this.foodTotal + this.calculatedDeliveryFee();
  });

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async submitOrder() {
    if (!this.selectedFile()) {
      alert('Please upload a payment proof screenshot.');
      return;
    }

    if (!this.userId) {
      alert('User session expired. Please log in again.');
      this.router.navigate(['/login']);
      return;
    }

    this.isSubmitting.set(true);

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile() as File);

      const uploadedFilename = await lastValueFrom(
        this.http.post(`${environment.apiUrl}/images/upload`, formData, { responseType: 'text' })
      );

      if (!uploadedFilename) throw new Error("Upload failed to return a filename");

      const orderItems = this.cartService.cartItems().map(item => ({
        restaurantId: item.restaurantId,
        menuItemId: item.id,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        priceAtPurchase: item.price
      }));

      const orderPayload = {
        customerId: this.userId,
        shippingPhone: this.locationData.shippingPhone,
        deliveryAddress: this.locationData.deliveryAddress,
        paymentImg: uploadedFilename,
        latitude: this.locationData.latitude,
        longitude: this.locationData.longitude,
        items: orderItems
      };

      await lastValueFrom(
        this.http.post(`${environment.apiUrl}/orders/v2/create`, orderPayload)
      );

      this.cartService.clearCart();
      this.showSuccessModal.set(true);

      setTimeout(() => {
        if (this.showSuccessModal()) {
          this.goToOrders();
        }
      }, 3000);

    } catch (error) {
      console.error("Order submission failed", error);
      alert("Failed to submit order. Please try again.");
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goToOrders() {
    this.showSuccessModal.set(false);
    this.router.navigate(['/customer/orders']);
  }
}
