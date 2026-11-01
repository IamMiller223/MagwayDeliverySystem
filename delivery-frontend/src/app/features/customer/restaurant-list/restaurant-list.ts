import {AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild} from '@angular/core';
import {RestaurantService} from '../../../core/services/RestaurantService';
import {Restaurant} from '../../../core/models/restaurant.model';
import {RouterLink} from '@angular/router';

import {environment} from '../../../../environments/environment';
import {catchError, debounceTime, distinctUntilChanged, of, Subject, Subscription, switchMap} from 'rxjs';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-restaurant-list',
  imports: [
    RouterLink,
    FormsModule
  ],
  templateUrl: './restaurant-list.html',
  styleUrl: './restaurant-list.css',
})
export class RestaurantList implements OnInit, AfterViewInit, OnDestroy{
  private restaurantService = inject(RestaurantService);

  @ViewChild('scrollSentinel') scrollSentinel!: ElementRef;
  private observer: IntersectionObserver | null = null;

  // Search Stream
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  searchQuery = signal<string>('');
  isSearching = signal<boolean>(false);

  // UI State Signals
  restaurants = signal<Restaurant[]>([]);
  isLoading = signal<boolean>(true);
  isFetchingMore = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Pagination State
  currentPage = 0;
  pageSize = 15;
  hasMoreData = true;

  ngOnInit() {
    this.fetchRestaurants();
    this.setupSearchListener();
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.searchSubscription?.unsubscribe();
  }

  private setupSearchListener() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        const trimmed = query.trim();

        // If user cleared the search bar, revert to normal paginated feed
        if (!trimmed) {
          this.isSearching.set(false);
          this.currentPage = 0;
          this.hasMoreData = true;
          this.fetchRestaurants(false);
          return of(null);
        }

        // Otherwise, run the search query
        this.isSearching.set(true);
        this.isLoading.set(true);
        this.errorMessage.set('');

        return this.restaurantService.searchRestaurants(trimmed).pipe(
          catchError(err => {
            console.error('Search failed', err);
            this.errorMessage.set('Could not search restaurants. Please try again.');
            return of({ data: [] as Restaurant[], message: '', error: 'Error' });
          })
        );
      })
    ).subscribe(response => {
      if (response) {
        this.restaurants.set(response.data || []);
        this.isLoading.set(false);
      }
    });
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }

  fetchRestaurants(isLoadMore = false) {
    if (!isLoadMore) {
      this.isLoading.set(true);
      this.errorMessage.set('');
    } else {
      this.isFetchingMore.set(true);
    }

    this.restaurantService.getRestaurants(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        const incomingData = response.data || [];

        if (incomingData.length < this.pageSize) {
          this.hasMoreData = false;
        }

        if (isLoadMore) {
          this.restaurants.update(current => [...current, ...incomingData]);
          this.isFetchingMore.set(false);
        } else {
          this.restaurants.set(incomingData);
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to load restaurants', err);
        this.errorMessage.set('Could not load restaurants. Please try again later.');
        this.isLoading.set(false);
        this.isFetchingMore.set(false);
      }
    });
  }

  private setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      // Disable infinite scroll while a search filter is active
      if (
        entry.isIntersecting &&
        !this.isSearching() &&
        !this.isFetchingMore() &&
        !this.isLoading() &&
        this.hasMoreData
      ) {
        this.currentPage++;
        this.fetchRestaurants(true);
      }
    }, options);

    if (this.scrollSentinel?.nativeElement) {
      this.observer.observe(this.scrollSentinel.nativeElement);
    }
  }

  getImageUrl(imagePath: string | undefined | null): string {
    if (!imagePath) return 'assets/placeholder-food.jpg';
    if (imagePath.startsWith('http')) return imagePath;
    return `${environment.serverUrl}/images/${imagePath}`;
  }
}
