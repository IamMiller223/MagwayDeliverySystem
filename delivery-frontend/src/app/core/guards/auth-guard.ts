import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {AuthService} from '../services/AuthService';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // If the user has a valid token, let them access the route
  if (authService.getToken()) {
    return true;
  }

  // If no token exists, kick them back to the login page
  router.navigate(['/login']);
  return false;
};
