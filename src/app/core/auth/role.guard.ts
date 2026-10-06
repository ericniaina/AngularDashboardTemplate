import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Reads `data.roles` (an `ACCESS` entry). Missing role → /forbidden with context for the page. */
export const roleGuard: CanActivateFn = (route, state) => {
  const roles = route.data['roles'] as readonly string[] | undefined;
  if (inject(AuthService).hasAnyRole(roles)) return true;
  return inject(Router).createUrlTree(['/forbidden'], {
    queryParams: { required: roles?.join(', ') ?? null, from: state.url },
  });
};
