import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../../environments/environment';

export interface CustomerProfile {
  userId: string;
  name: string;
  image: string | null;
  phone: string | null;
  email: string;
  role: 'CUSTOMER' | string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/user`;

  getAllCustomers(): Observable<ApiResponse<CustomerProfile[]>> {
    return this.http.get<ApiResponse<CustomerProfile[]>>(this.baseUrl);
  }


  getCustomerById(userId: string): Observable<ApiResponse<CustomerProfile>> {
    return this.http.get<ApiResponse<CustomerProfile>>(`${this.baseUrl}/${userId}`);
  }


  deleteCustomer(userId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${userId}`);
  }
}
