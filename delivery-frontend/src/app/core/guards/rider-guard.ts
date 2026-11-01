import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/AuthService';

function extractNormalizedRole(user: any): string | null {
  if (!user) return null;
  const rawRole =
    user.role ||
    user.userRole ||
    (Array.isArray(user.roles) ? user.roles[0] : null) ||
    localStorage.getItem('role');
  if (!rawRole) return null;
  return String(rawRole).toUpperCase().replace(/^ROLE_/, '');
}

/**
 * If a Rider presses browser back to /customer, they are redirected to /rider.
 */
export const noRiderInCustomerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = extractNormalizedRole(authService.currentUser());
  if (role === 'RIDER') {
    return router.createUrlTree(['/rider']);
  }
  return true;
};

/**
 * Ensures only RIDER (or ADMIN) can access /rider routes.
 */
export const riderGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = extractNormalizedRole(authService.currentUser());
  if (role === 'RIDER' || role === 'ADMIN') {
    return true;
  }
  return router.createUrlTree(['/login']);
};
