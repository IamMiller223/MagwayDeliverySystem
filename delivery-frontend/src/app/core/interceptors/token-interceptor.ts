import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/AuthService';
import { catchError, throwError } from 'rxjs';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Only skip public auth routes (do NOT skip /api/auth/user/...)
  const isPublicAuthUrl =
    req.url.includes('/api/auth/login') ||
    req.url.includes('/api/auth/sign-up') ||
    req.url.includes('/api/auth/token');

  if (isPublicAuthUrl) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.getToken();

  let clonedReq = req;
  if (token) {
    clonedReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If Spring Boot rejects the token (e.g., it is expired)
      if (error.status === 401 && token) {
        // 1. Silently log the user out (wipes the bad token from local storage)
        authService.logout();

        // 2. Strip the bad Authorization header from the request
        const guestReq = req.clone({
          headers: req.headers.delete('Authorization')
        });

        // 3. Instantly retry the exact same request as a pure guest!
        return next(guestReq);
      }

      return throwError(() => error);
    })
  );
};
