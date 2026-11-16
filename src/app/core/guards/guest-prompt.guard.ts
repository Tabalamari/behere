import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthModalService, AuthModalMode } from '../services/auth-modal.service';

/**
 * Functional helper to guard actions from guests.
 * If user is authenticated, executes action immediately.
 * If guest, intercepts action and displays the Auth modal.
 */
export function requireAuth(
  authService: AuthService,
  authModalService: AuthModalService,
  actionCallback: () => void,
  mode: AuthModalMode = 'signin'
): void {
  if (authService.isAuthenticated()) {
    actionCallback();
  } else {
    authModalService.open(mode, actionCallback);
  }
}

/**
 * Route guard that protects private routes (like /cabinet).
 * If user is not authenticated, redirects to '/' and opens the sign-in modal.
 */
export const authRouteGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const authModalService = inject(AuthModalService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  authModalService.open('signin');
  return router.createUrlTree(['/']);
};
