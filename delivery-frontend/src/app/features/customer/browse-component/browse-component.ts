import {Component, inject, signal} from '@angular/core';
import {RestaurantService} from '../../../core/services/RestaurantService';
import {catchError, debounceTime, distinctUntilChanged, of, Subject, Subscription, switchMap} from 'rxjs';
import {Restaurant} from '../../../core/models/restaurant.model';
import {environment} from '../../../../environments/environment';
import {RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-browse-component',
  imports: [
    RouterLink,
    FormsModule
  ],
  templateUrl: './browse-component.html',
  styleUrl: './browse-component.css',
})
export class BrowseComponent {

  private restaurantService = inject(RestaurantService);
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  searchQuery = signal<string>('');
  restaurants = signal<Restaurant[]>([]);
  isLoading = signal<boolean>(false);
  hasSearched = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after the last keystroke
      distinctUntilChanged(), // Only emit if the value changed
      switchMap(query => {
        const trimmed = query.trim();
        if (!trimmed) {
          this.isLoading.set(false);
          this.hasSearched.set(false);
          return of({ data: [] as Restaurant[], message: '', error: null });
        }

        this.isLoading.set(true);
        this.errorMessage.set('');
        this.hasSearched.set(true);

        return this.restaurantService.searchRestaurants(trimmed).pipe(
          catchError(err => {
            console.error('Search error:', err);
            this.errorMessage.set('Failed to search restaurants. Please try again.');
            return of({ data: [] as Restaurant[], message: '', error: 'Error' });
          })
        );
      })
    ).subscribe(response => {
      this.restaurants.set(response.data || []);
      this.isLoading.set(false);
    });
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.restaurants.set([]);
    this.hasSearched.set(false);
    this.errorMessage.set('');
    this.searchSubject.next('');
  }

  getImageUrl(imagePath: string | undefined | null): string {
    if (!imagePath) return 'assets/placeholder-food.jpg';
    if (imagePath.startsWith('http')) return imagePath;
    return `${environment.serverUrl}/images/${imagePath}`;
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

}
