import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { Restaurant } from '../models/restaurant.model';
import { RestaurantMenuData } from '../models/restaurant-menu-data.model';
import { environment } from '../../../environments/environment';

export type { Restaurant, RestaurantMenuData };

export interface RestaurantRequest {
  name: string;
  phone: string;
  image: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  image: string;
  category: string;
  price: number;
  isAvailable: boolean;
}

export interface MenuItemRequest {
  name: string;
  description: string;
  image: string;
  category: string;
  price: number;
  isAvailable: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RestaurantService {
  private http = inject(HttpClient);
  // Dynamically set based on the active environment
  private apiUrl = `${environment.apiUrl}/restaurants`;
  private imageUploadUrl = `${environment.apiUrl}/images/upload`;


  getRestaurants(page: number = 0, size: number = 15): Observable<ApiResponse<Restaurant[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse<Restaurant[]>>(this.apiUrl, { params });
  }

  getAllRestaurants(page: number = 0, size: number = 15): Observable<ApiResponse<Restaurant[]>> {
    return this.getRestaurants(page, size);
  }

  getRestaurantMenu(
    restaurantId: string,
    page: number = 0,
    size: number = 15
  ): Observable<ApiResponse<RestaurantMenuData>> {
    const url = `${this.apiUrl}/${restaurantId}`;
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse<RestaurantMenuData>>(url, { params });
  }

  searchRestaurants(query: string): Observable<ApiResponse<Restaurant[]>> {
    const params = new HttpParams().set('query', query);
    return this.http.get<ApiResponse<Restaurant[]>>(`${this.apiUrl}/search`, { params });
  }


  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(this.imageUploadUrl, formData, {
      responseType: 'text',
    });
  }


  getRestaurantById(restaurantId: string): Observable<ApiResponse<Restaurant>> {
    return this.http.get<ApiResponse<Restaurant>>(
      `${this.apiUrl}/getRestaurantById/${restaurantId}`
    );
  }

  createRestaurant(payload: RestaurantRequest): Observable<ApiResponse<Restaurant>> {
    return this.http.post<ApiResponse<Restaurant>>(this.apiUrl, payload);
  }

  updateRestaurant(
    restaurantId: string,
    payload: Partial<RestaurantRequest>
  ): Observable<ApiResponse<Restaurant>> {
    return this.http.put<ApiResponse<Restaurant>>(
      `${this.apiUrl}/${restaurantId}`,
      payload
    );
  }

  deleteRestaurant(restaurantId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${restaurantId}`);
  }

  createMenuItem(
    restaurantId: string,
    payload: MenuItemRequest
  ): Observable<ApiResponse<MenuItem>> {
    return this.http.post<ApiResponse<MenuItem>>(
      `${this.apiUrl}/${restaurantId}/menu`,
      payload
    );
  }

  updateMenuItem(
    restaurantId: string,
    menuId: string,
    payload: Partial<MenuItemRequest>
  ): Observable<ApiResponse<MenuItem>> {
    return this.http.put<ApiResponse<MenuItem>>(
      `${this.apiUrl}/${restaurantId}/menu/${menuId}`,
      payload
    );
  }


  deleteMenuItem(restaurantId: string, menuId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/${restaurantId}/menu/${menuId}`
    );
  }
}
