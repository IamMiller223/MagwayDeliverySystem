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
import { CommonModule, DecimalPipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import * as L from 'leaflet';

import { environment } from '../../../../environments/environment';
import {
  MenuItemRequest,
  Restaurant,
  RestaurantRequest,
  RestaurantService
} from '../../../core/services/RestaurantService';
import {MenuItem} from '../../../core/models/menu-item.model';

@Component({
  selector: 'app-restaurants-management',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, SlicePipe, UpperCasePipe],
  templateUrl: './restaurants-management.html',
  styleUrl: './restaurants-management.css',
})
export class RestaurantsManagement implements OnInit, OnDestroy {
  private restaurantService = inject(RestaurantService);

  @ViewChild('pickerMapContainer', { static: false })
  pickerMapElement!: ElementRef<HTMLDivElement>;

  // Master List: Restaurants State
  isLoadingRestaurants = signal<boolean>(true);
  restaurants = signal<Restaurant[]>([]);
  restaurantPage = signal<number>(0);
  restaurantPageSize = signal<number>(15);
  restaurantSearch = signal<string>('');

  // Selected Restaurant & Detail Menu State
  selectedRestaurant = signal<Restaurant | null>(null);
  isLoadingMenu = signal<boolean>(false);
  menuItems = signal<MenuItem[]>([]);
  menuPage = signal<number>(0);
  menuPageSize = signal<number>(15);
  menuSearch = signal<string>('');
  selectedCategory = signal<string>('ALL');

  // Restaurant Create/Edit Drawer State
  isRestaurantDrawerOpen = signal<boolean>(false);
  isEditingRestaurant = signal<boolean>(false);
  editingRestaurantId = signal<string | null>(null);
  isSubmittingRestaurant = signal<boolean>(false);
  isUploadingRestaurantImg = signal<boolean>(false);

  restFormName = signal<string>('');
  restFormPhone = signal<string>('09');
  restFormAddress = signal<string>('');
  restFormImage = signal<string>('');
  restFormLat = signal<number>(20.1495);
  restFormLng = signal<number>(94.932);

  // Menu Item Create/Edit Drawer State
  isMenuDrawerOpen = signal<boolean>(false);
  isEditingMenu = signal<boolean>(false);
  editingMenuId = signal<string | null>(null);
  isSubmittingMenu = signal<boolean>(false);
  isUploadingMenuImg = signal<boolean>(false);

  menuFormName = signal<string>('');
  menuFormDescription = signal<string>('');
  menuFormCategory = signal<string>('Main Course');
  menuFormPrice = signal<number>(5000);
  menuFormImage = signal<string>('');
  menuFormAvailable = signal<boolean>(true);

  readonly presetCategories = ['food','drinks'];

  // Bounded Magway Delivery Polygon for Leaflet Coordinate Picker
  readonly magwayDeliveryPolygon: [number, number][] = [
    [20.1748131, 94.9124883], [20.1699665, 94.9168087], [20.1822311, 94.909011],
    [20.1678097, 94.9998004], [20.1221314, 95.0051063], [20.1101667, 94.9513089],
    [20.1163144, 94.9360626], [20.1301248, 94.9261076], [20.1355613, 94.9239069],
    [20.1430014, 94.9186722], [20.1473698, 94.9166365], [20.1509873, 94.9159095],
    [20.1614297, 94.9167092], [20.1636137, 94.9161276], [20.1663436, 94.9167092],
    [20.1684592, 94.9161276], [20.1696876, 94.9166365], [20.1745329, 94.913583],
    [20.1748131, 94.9124883],
  ];

  private pickerMap: L.Map | null = null;
  private pickerMarker: L.Marker | null = null;

  // Computed Filters
  filteredRestaurants = computed(() => {
    const q = this.restaurantSearch().trim().toLowerCase();
    if (!q) return this.restaurants();
    return this.restaurants().filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)
    );
  });

  availableCategories = computed(() => {
    const dynamic = new Set<string>(['ALL']);
    for (const item of this.menuItems()) {
      if (item.category) dynamic.add(item.category);
    }
    return Array.from(dynamic);
  });

  filteredMenuItems = computed(() => {
    const cat = this.selectedCategory();
    const q = this.menuSearch().trim().toLowerCase();

    return this.menuItems().filter((item) => {
      const matchesCat = cat === 'ALL' || item.category === cat;
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  });

  availableMenuCount = computed(
    () => this.menuItems().filter((m) => m.isAvailable).length
  );

  ngOnInit() {
    this.loadRestaurants();
  }

  ngOnDestroy() {
    this.destroyPickerMap();
  }

  // ==================== 1. RESTAURANT OPERATIONS ====================

  async loadRestaurants() {
    this.isLoadingRestaurants.set(true);
    try {
      const res = await lastValueFrom(
        this.restaurantService.getAllRestaurants(this.restaurantPage(), this.restaurantPageSize())
      );
      const list = res?.data || [];
      this.restaurants.set(list);

      // Auto-select first restaurant if none selected
      if (!this.selectedRestaurant() && list.length > 0) {
        this.selectRestaurant(list[0]);
      } else if (this.selectedRestaurant()) {
        const updated = list.find(
          (r) => r.restaurantId === this.selectedRestaurant()?.restaurantId
        );
        if (updated) this.selectedRestaurant.set(updated);
      }
    } catch (err) {
      console.error('Could not load restaurants list:', err);
    } finally {
      this.isLoadingRestaurants.set(false);
    }
  }



  selectRestaurant(restaurant: Restaurant) {
    this.selectedRestaurant.set(restaurant);
    this.menuPage.set(0);
    this.selectedCategory.set('ALL');
    this.loadMenuForSelectedRestaurant();
  }

  nextRestaurantPage() {
    if (this.restaurants().length < this.restaurantPageSize()) return;
    this.restaurantPage.update((p) => p + 1);
    this.loadRestaurants();
  }

  prevRestaurantPage() {
    if (this.restaurantPage() === 0) return;
    this.restaurantPage.update((p) => p - 1);
    this.loadRestaurants();
  }

  // --- Restaurant Create / Edit Drawer & Map ---

  openCreateRestaurantDrawer() {
    this.isEditingRestaurant.set(false);
    this.editingRestaurantId.set(null);
    this.restFormName.set('');
    this.restFormPhone.set('09');
    this.restFormAddress.set('');
    this.restFormImage.set('');
    this.restFormLat.set(20.1495);
    this.restFormLng.set(94.932);
    this.isRestaurantDrawerOpen.set(true);

    setTimeout(() => this.initPickerMap(), 120);
  }

  openEditRestaurantDrawer(restaurant: Restaurant, event?: MouseEvent) {
    event?.stopPropagation();
    this.isEditingRestaurant.set(true);
    this.editingRestaurantId.set(restaurant.restaurantId);
    this.restFormName.set(restaurant.name);
    this.restFormPhone.set(restaurant.phone);
    this.restFormAddress.set(restaurant.address);
    this.restFormImage.set(restaurant.image);
    this.restFormLat.set(restaurant.latitude || 20.1495);
    this.restFormLng.set(restaurant.longitude || 94.932);
    this.isRestaurantDrawerOpen.set(true);

    setTimeout(() => this.initPickerMap(), 120);
  }

  closeRestaurantDrawer() {
    this.isRestaurantDrawerOpen.set(false);
    this.destroyPickerMap();
  }

  async onRestaurantFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploadingRestaurantImg.set(true);
    try {
      const filename = await lastValueFrom(this.restaurantService.uploadImage(file));
      this.restFormImage.set(filename.trim());
    } catch (err) {
      console.error('Failed to upload restaurant image:', err);
      alert('Failed to upload image to /api/images/upload.');
    } finally {
      this.isUploadingRestaurantImg.set(false);
    }
  }

  async saveRestaurant() {
    if (this.isSubmittingRestaurant()) return;

    const payload: RestaurantRequest = {
      name: this.restFormName().trim(),
      phone: this.restFormPhone().trim(),
      image: this.restFormImage().trim(),
      address: this.restFormAddress().trim(),
      latitude: Number(this.restFormLat()),
      longitude: Number(this.restFormLng()),
    };

    if (!payload.name || !payload.phone || !payload.address) {
      alert('Please fill in restaurant name, phone, and address.');
      return;
    }

    if (!this.isPointInPolygon({ lat: payload.latitude, lng: payload.longitude })) {
      alert('Selected coordinates are outside the Magway delivery zone.');
      return;
    }

    this.isSubmittingRestaurant.set(true);
    try {
      if (this.isEditingRestaurant() && this.editingRestaurantId()) {
        const id = this.editingRestaurantId()!;
        const res = await lastValueFrom(this.restaurantService.updateRestaurant(id, payload));
        if (res?.data) {
          this.restaurants.update((list) =>
            list.map((r) => (r.restaurantId === id ? res.data : r))
          );
          if (this.selectedRestaurant()?.restaurantId === id) {
            this.selectedRestaurant.set(res.data);
          }
        }
      } else {
        const res = await lastValueFrom(this.restaurantService.createRestaurant(payload));
        if (res?.data) {
          this.restaurants.update((list) => [res.data, ...list]);
          this.selectRestaurant(res.data);
        }
      }
      this.closeRestaurantDrawer();
    } catch (err) {
      console.error('Failed to save restaurant:', err);
      alert('Could not save restaurant. Please check the form and try again.');
    } finally {
      this.isSubmittingRestaurant.set(false);
    }
  }

  async confirmDeleteRestaurant(restaurant: Restaurant, event?: MouseEvent) {
    event?.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${restaurant.name}"?`)) return;

    try {
      await lastValueFrom(this.restaurantService.deleteRestaurant(restaurant.restaurantId));
      this.restaurants.update((list) =>
        list.filter((r) => r.restaurantId !== restaurant.restaurantId)
      );

      if (this.selectedRestaurant()?.restaurantId === restaurant.restaurantId) {
        const remaining = this.restaurants();
        if (remaining.length > 0) {
          this.selectRestaurant(remaining[0]);
        } else {
          this.selectedRestaurant.set(null);
          this.menuItems.set([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete restaurant:', err);
      alert('Could not delete restaurant.');
    }
  }

  // ==================== 2. MENU ITEM OPERATIONS ====================

  async loadMenuForSelectedRestaurant() {
    const rest = this.selectedRestaurant();
    if (!rest) return;

    this.isLoadingMenu.set(true);
    try {
      const res = await lastValueFrom(
        this.restaurantService.getRestaurantMenu(
          rest.restaurantId,
          this.menuPage(),
          this.menuPageSize()
        )
      );
      this.menuItems.set(res?.data?.menuItems || []);
    } catch (err) {
      console.error('Failed to fetch menu items:', err);
      this.menuItems.set([]);
    } finally {
      this.isLoadingMenu.set(false);
    }
  }

  nextMenuPage() {
    if (this.menuItems().length < this.menuPageSize()) return;
    this.menuPage.update((p) => p + 1);
    this.loadMenuForSelectedRestaurant();
  }

  prevMenuPage() {
    if (this.menuPage() === 0) return;
    this.menuPage.update((p) => p - 1);
    this.loadMenuForSelectedRestaurant();
  }

  openCreateMenuDrawer() {
    if (!this.selectedRestaurant()) return;
    this.isEditingMenu.set(false);
    this.editingMenuId.set(null);
    this.menuFormName.set('');
    this.menuFormDescription.set('');
    this.menuFormCategory.set('Main Course');
    this.menuFormPrice.set(5000);
    this.menuFormImage.set('');
    this.menuFormAvailable.set(true);
    this.isMenuDrawerOpen.set(true);
  }

  openEditMenuDrawer(item: MenuItem) {
    this.isEditingMenu.set(true);
    this.editingMenuId.set(item.id);
    this.menuFormName.set(item.name);
    this.menuFormDescription.set(item.description || '');
    this.menuFormCategory.set(item.category || 'Main Course');
    this.menuFormPrice.set(item.price);
    this.menuFormImage.set(item.image || '');
    this.menuFormAvailable.set(item.isAvailable);
    this.isMenuDrawerOpen.set(true);
  }

  closeMenuDrawer() {
    this.isMenuDrawerOpen.set(false);
  }

  async onMenuFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploadingMenuImg.set(true);
    try {
      const filename = await lastValueFrom(this.restaurantService.uploadImage(file));
      this.menuFormImage.set(filename.trim());
    } catch (err) {
      console.error('Failed to upload menu image:', err);
      alert('Failed to upload image to /api/images/upload.');
    } finally {
      this.isUploadingMenuImg.set(false);
    }
  }

  async saveMenuItem() {
    const rest = this.selectedRestaurant();
    if (!rest || this.isSubmittingMenu()) return;

    const payload: MenuItemRequest = {
      name: this.menuFormName().trim(),
      description: this.menuFormDescription().trim(),
      image: this.menuFormImage().trim(),
      category: this.menuFormCategory().trim() || 'food',
      price: Number(this.menuFormPrice()),
      isAvailable: this.menuFormAvailable(),
    };

    if (!payload.name || payload.price <= 0) {
      alert('Please enter a valid menu item name and price.');
      return;
    }

    this.isSubmittingMenu.set(true);
    try {
      if (this.isEditingMenu() && this.editingMenuId()) {
        const menuId = this.editingMenuId()!;
        const res = await lastValueFrom(
          this.restaurantService.updateMenuItem(rest.restaurantId, menuId, payload)
        );
        if (res?.data) {
          this.menuItems.update((list) =>
            list.map((m) => (m.id === menuId ? res.data : m))
          );
        }
      } else {
        const res = await lastValueFrom(
          this.restaurantService.createMenuItem(rest.restaurantId, payload)
        );
        if (res?.data) {
          this.menuItems.update((list) => [res.data, ...list]);
        }
      }
      this.closeMenuDrawer();
    } catch (err) {
      console.error('Failed to save menu item:', err);
      alert('Could not save menu item.');
    } finally {
      this.isSubmittingMenu.set(false);
    }
  }

  async toggleMenuItemAvailability(item: MenuItem) {
    const rest = this.selectedRestaurant();
    if (!rest) return;

    const newStatus = !item.isAvailable;
    try {
      const res = await lastValueFrom(
        this.restaurantService.updateMenuItem(rest.restaurantId, item.id, {
          isAvailable: newStatus,
          price: item.price,
        })
      );
      if (res?.data) {
        this.menuItems.update((list) =>
          list.map((m) => (m.id === item.id ? res.data : m))
        );
      }
    } catch (err) {
      console.error('Failed to toggle availability:', err);
      alert('Could not update item availability.');
    }
  }

  async confirmDeleteMenuItem(item: MenuItem) {
    const rest = this.selectedRestaurant();
    if (!rest) return;
    if (!confirm(`Delete menu item "${item.name}"?`)) return;

    try {
      await lastValueFrom(
        this.restaurantService.deleteMenuItem(rest.restaurantId, item.id)
      );
      this.menuItems.update((list) => list.filter((m) => m.id !== item.id));
    } catch (err) {
      console.error('Failed to delete menu item:', err);
      alert('Could not delete menu item.');
    }
  }

  // ==================== 3. LEAFLET POLYGON MAP FOR RESTAURANT FORM ====================

  private isPointInPolygon(latlng: { lat: number; lng: number }): boolean {
    const x = latlng.lng;
    const y = latlng.lat;
    let inside = false;

    for (
      let i = 0, j = this.magwayDeliveryPolygon.length - 1;
      i < this.magwayDeliveryPolygon.length;
      j = i++
    ) {
      const xi = this.magwayDeliveryPolygon[i][1];
      const yi = this.magwayDeliveryPolygon[i][0];
      const xj = this.magwayDeliveryPolygon[j][1];
      const yj = this.magwayDeliveryPolygon[j][0];

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private initPickerMap() {
    this.destroyPickerMap();
    if (!this.pickerMapElement?.nativeElement) return;

    const viewBounds = L.latLngBounds(
      L.latLng(20.09, 94.89),
      L.latLng(20.21, 95.02)
    );

    this.pickerMap = L.map(this.pickerMapElement.nativeElement, {
      center: [this.restFormLat(), this.restFormLng()],
      zoom: 14,
      maxBounds: viewBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 13,
    });

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps',
    }).addTo(this.pickerMap);

    L.polygon(this.magwayDeliveryPolygon as L.LatLngExpression[], {
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(this.pickerMap);

    const pinIcon = L.divIcon({
      className: 'custom-rest-pin',
      html: `<div style="background:#ea580c;color:#fff;padding:5px 10px;border-radius:999px;font-weight:800;font-size:11px;border:2px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.3);white-space:nowrap;">🏪 Restaurant Pin</div>`,
      iconSize: [120, 28],
      iconAnchor: [60, 14],
    });

    this.pickerMarker = L.marker([this.restFormLat(), this.restFormLng()], {
      icon: pinIcon,
      draggable: true,
    }).addTo(this.pickerMap);

    this.pickerMarker.on('dragend', (event: any) => {
      const pos = event.target.getLatLng();
      if (this.isPointInPolygon(pos)) {
        this.restFormLat.set(Number(pos.lat.toFixed(6)));
        this.restFormLng.set(Number(pos.lng.toFixed(6)));
      } else {
        alert('Restaurant location must be inside the Magway delivery zone.');
        this.pickerMarker?.setLatLng([this.restFormLat(), this.restFormLng()]);
      }
    });

    this.pickerMap.on('click', (event: any) => {
      if (this.isPointInPolygon(event.latlng)) {
        this.pickerMarker?.setLatLng(event.latlng);
        this.restFormLat.set(Number(event.latlng.lat.toFixed(6)));
        this.restFormLng.set(Number(event.latlng.lng.toFixed(6)));
      } else {
        alert('Restaurant location must be inside the Magway delivery zone.');
      }
    });

    setTimeout(() => this.pickerMap?.invalidateSize(), 200);
  }

  private destroyPickerMap() {
    if (this.pickerMap) {
      this.pickerMap.remove();
      this.pickerMap = null;
      this.pickerMarker = null;
    }
  }

  resolveImageUrl(img?: string | null): string {
    if (!img) return '';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}/images/${img}`;
  }
}
