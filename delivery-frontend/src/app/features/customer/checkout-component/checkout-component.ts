import { AfterViewInit, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-checkout-component',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './checkout-component.html',
  styleUrl: './checkout-component.css',
})
export class CheckoutComponent implements OnInit, AfterViewInit {
  router = inject(Router);

  private map: any;
  private marker: any;

  shippingPhone = signal<string>('+959');
  deliveryAddress = signal<string>('');
  selectedLat = signal<number>(20.1504);
  selectedLng = signal<number>(94.9301);

  readonly magwayDeliveryPolygon = [
    [20.1748131, 94.9124883], [20.1699665, 94.9168087], [20.1822311, 94.909011],
    [20.1678097, 94.9998004], [20.1221314, 95.0051063], [20.1101667, 94.9513089],
    [20.1163144, 94.9360626], [20.1301248, 94.9261076], [20.1355613, 94.9239069],
    [20.1430014, 94.9186722], [20.1473698, 94.9166365], [20.1509873, 94.9159095],
    [20.1614297, 94.9167092], [20.1636137, 94.9161276], [20.1663436, 94.9167092],
    [20.1684592, 94.9161276], [20.1696876, 94.9166365], [20.1745329, 94.913583],
    [20.1748131, 94.9124883]
  ];

  ngOnInit() {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  private isPointInPolygon(latlng: any): boolean {
    const x = latlng.lng;
    const y = latlng.lat;
    let inside = false;

    for (let i = 0, j = this.magwayDeliveryPolygon.length - 1; i < this.magwayDeliveryPolygon.length; j = i++) {
      const xi = this.magwayDeliveryPolygon[i][1], yi = this.magwayDeliveryPolygon[i][0];
      const xj = this.magwayDeliveryPolygon[j][1], yj = this.magwayDeliveryPolygon[j][0];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private initMap() {
    const viewBounds = L.latLngBounds(L.latLng(20.0900, 94.8900), L.latLng(20.2100, 95.0200));

    this.map = L.map('map', {
      center: [this.selectedLat(), this.selectedLng()],
      zoom: 14,
      maxBounds: viewBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 13,
      zoomControl: false
    });
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '© Google',
      maxZoom: 20
    }).addTo(this.map);

    L.polygon(this.magwayDeliveryPolygon as L.LatLngExpression[], {
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      weight: 2
    }).addTo(this.map);

    const customIcon = L.icon({
      iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });

    this.marker = L.marker([this.selectedLat(), this.selectedLng()], {
      icon: customIcon,
      draggable: true
    }).addTo(this.map);

    this.marker.on('dragend', (event: any) => {
      const position = event.target.getLatLng();
      if (this.isPointInPolygon(position)) {
        this.updateCoordinates(position.lat, position.lng);
      } else {
        alert("This location is outside our delivery zone.");
        this.marker.setLatLng([this.selectedLat(), this.selectedLng()]);
      }
    });

    this.map.on('click', (event: any) => {
      if (this.isPointInPolygon(event.latlng)) {
        this.marker.setLatLng(event.latlng);
        this.updateCoordinates(event.latlng.lat, event.latlng.lng);
      } else {
        alert("This location is outside our delivery zone.");
      }
    });

    setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 200);
  }

  getCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const currentLatLng = L.latLng(lat, lng);

        if (this.isPointInPolygon(currentLatLng)) {
          this.marker.setLatLng(currentLatLng);
          this.map.setView(currentLatLng, 16);
          this.updateCoordinates(lat, lng);
        } else {
          alert("Your current physical location is outside our Magway delivery zone.");
        }
      },
      (error) => {
        alert("Unable to retrieve your location. Please check your browser permissions.");
      },
      { enableHighAccuracy: true }
    );
  }

  private updateCoordinates(lat: number, lng: number) {
    this.selectedLat.set(lat);
    this.selectedLng.set(lng);
  }

  continueToNextStep() {
    const phone = this.shippingPhone().replace(/\s/g, '');

    const phoneRegex = /^(?:\+959|09)\d{7,9}$/;

    if (!phoneRegex.test(phone)) {
      alert('Please enter a valid Myanmar phone number (e.g., 094... or +959...).');
      return;
    }

    if (!this.deliveryAddress().trim()) {
      alert('Please enter specific delivery details (e.g., Hostel, Room Number).');
      return;
    }

    const locationData = {
      shippingPhone: phone,
      deliveryAddress: this.deliveryAddress(),
      latitude: this.selectedLat(),
      longitude: this.selectedLng()
    };

    this.router.navigate(['/customer/checkout/payment'], { state: { locationData } });
  }
}
