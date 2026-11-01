import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/AuthService';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const token = authService.getToken();
  const user = authService.currentUser();

  // 1. Check if the user is authenticated at all
  if (!token || !user) {
    router.navigate(['/login']);
    return false;
  }

  // 2. Check if the authenticated user has the ADMIN role
  if (user.role === 'ADMIN') {
    return true;
  }

  // 3. User is logged in, but is NOT an admin. Redirect to customer home.
  console.warn('Access Denied: Requires ADMIN privileges.');
  router.navigate(['/customer']);
  return false;
};
