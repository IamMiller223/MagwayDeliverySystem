import { Component, ElementRef, inject, OnInit, signal, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RestaurantService } from '../../../core/services/RestaurantService';
import { RestaurantMenuData } from '../../../core/models/restaurant-menu-data.model';
import { CurrencyPipe } from '@angular/common';
import { MenuItem } from '../../../core/models/menu-item.model';
import { CartService } from '../../../core/services/cart-service';

import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-restaurant-menu',
  imports: [
    CurrencyPipe
  ],
  templateUrl: './restaurant-menu.html',
  styleUrl: './restaurant-menu.css',
})
export class RestaurantMenu implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private restaurantService = inject(RestaurantService);
  private cartService = inject(CartService);

  @ViewChild('scrollSentinel') scrollSentinel!: ElementRef;
  private observer: IntersectionObserver | null = null;

  // UI State
  menuData = signal<RestaurantMenuData | null>(null);
  isLoading = signal<boolean>(true);
  isFetchingMore = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Pagination State
  currentRestaurantId = '';
  currentPage = 0;
  pageSize = 15;
  hasMoreData = signal<boolean>(true);

  ngOnInit() {
    this.currentRestaurantId = this.route.snapshot.paramMap.get('id') || '';

    if (this.currentRestaurantId) {
      this.fetchMenu();
    } else {
      this.errorMessage.set('Invalid restaurant ID.');
      this.isLoading.set(false);
    }
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  ngOnDestroy() {
    if (this.observer) this.observer.disconnect();
  }

  fetchMenu(isLoadMore = false) {
    if (!isLoadMore) {
      this.isLoading.set(true);
    } else {
      this.isFetchingMore.set(true);
    }

    this.restaurantService.getRestaurantMenu(this.currentRestaurantId, this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        const incomingItems = response.data?.menuItems || [];

        if (incomingItems.length < this.pageSize) {
          this.hasMoreData.set(false);
        }

        if (isLoadMore) {
          this.menuData.update(current => {
            if (!current) return response.data;
            return {
              ...current,
              menuItems: [...current.menuItems, ...incomingItems]
            };
          });
          this.isFetchingMore.set(false);
        } else {
          this.menuData.set(response.data);
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to load menu', err);
        this.errorMessage.set('Could not load the menu. Please try again later.');
        this.isLoading.set(false);
        this.isFetchingMore.set(false);
      }
    });
  }

  private setupIntersectionObserver() {
    const options = { root: null, rootMargin: '100px', threshold: 0.1 };

    this.observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !this.isFetchingMore() && !this.isLoading() && this.hasMoreData()) {
        this.currentPage++;
        this.fetchMenu(true);
      }
    }, options);

    if (this.scrollSentinel?.nativeElement) {
      this.observer.observe(this.scrollSentinel.nativeElement);
    }
  }

  addToCart(item: MenuItem) {
    this.cartService.addToCart(item);
    console.log(`Added ${item.name} to cart. Total items: ${this.cartService.totalItems()}`);
  }

  getImageUrl(imagePath: string | undefined | null, fallback: string = 'assets/placeholder-food.jpg'): string {
    if (!imagePath) return fallback;
    if (imagePath.startsWith('http')) return imagePath;

    // Uses dynamic environment variable
    return `${environment.serverUrl}/images/${imagePath}`;
  }
}
