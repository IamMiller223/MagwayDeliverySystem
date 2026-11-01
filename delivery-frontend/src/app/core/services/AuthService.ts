import {inject, Injectable, signal} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {AuthUserData} from '../models/auth-user-data.model';
import {LoginRequest} from '../models/login-request.model';
import {AuthResponse} from '../models/auth-response.model';
import {Observable, tap} from 'rxjs';

// 1. Import the environment file
import { environment } from '../../../environments/environment';
import {ApiResponse} from '../models/api-response.model';


export interface UserProfile {
  userId: string;
  name: string;
  image: string;
  phone: string;
  email: string;
  role: string;
}

export interface UpdateProfilePayload {
  name?: string;
  image?: string;
  phone?: string;
}

export interface UpdateEmailPayload {
  newEmail: string;
}

export interface UpdatePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
}

export interface SignUpResponseData {
  userId: string;
  name: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);

  // A reactive signal holding the current user's state
  public currentUser = signal<AuthUserData | null>(this.loadUserFromStorage());


  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const token = this.currentUser()?.token;
    const headers = new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    return this.http.post(
      `${environment.serverUrl}/api/images/upload`,
      formData,
      { headers, responseType: 'text' }
    );
  }

  signUp(payload: SignUpPayload): Observable<ApiResponse<SignUpResponseData>> {
    return this.http.post<ApiResponse<SignUpResponseData>>(
      `${environment.apiUrl}/auth/sign-up`,
      payload
    );
  }

  login(credentials: LoginRequest) {
    // 2. Use the environment variable for the URL
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.data && response.data.token) {
          // 1. Save data to local storage for persistence
          localStorage.setItem('auth_user', JSON.stringify(response.data));
          localStorage.setItem('token', response.data.token);

          // 2. Update the Signal so the rest of the app updates instantly
          this.currentUser.set(response.data);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('token');
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private loadUserFromStorage(): AuthUserData | null {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  }

  // GET: /api/auth/user/{userId}
  getUserProfile(userId: string): Observable<ApiResponse<UserProfile>> {
    return this.http.get<ApiResponse<UserProfile>>(
      `${environment.apiUrl}/auth/user/${userId}`
    );
  }

  // PUT: /api/user/{userId} (or /api/auth/user/${userId} depending on your controller)
  updateUserProfile(
    userId: string,
    payload: UpdateProfilePayload
  ): Observable<ApiResponse<UserProfile>> {
    return this.http.put<ApiResponse<UserProfile>>(
      `${environment.apiUrl}/user/${userId}`,
      payload
    ).pipe(
      tap((res) => {
        // Immediately sync updated name and image with the Top Navbar
        const current = this.currentUser();
        if (current) {
          const updatedUser = {
            ...current,
            name: res.data?.name ?? payload.name ?? current.name,
            img: res.data?.image ?? payload.image ?? current.img
          };
          this.currentUser.set(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      })
    );
  }

  // PUT: /api/auth/user/{userId}/email
  updateUserEmail(userId: string, newEmail: string): Observable<ApiResponse<boolean>> {
    const payload: UpdateEmailPayload = { newEmail };
    return this.http.put<ApiResponse<boolean>>(
      `${environment.apiUrl}/auth/user/${userId}/email`,
      payload
    );
  }

  updateUserPassword(
    userId: string,
    payload: UpdatePasswordPayload
  ): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${environment.apiUrl}/auth/user/${userId}/password`,
      payload
    );
  }
}
