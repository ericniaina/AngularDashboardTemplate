import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  provideRouter,
  type RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { ACCESS } from './access-policy';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { roleGuard } from './role.guard';

describe('route guards', () => {
  const roles = signal<string[] | null>(null);

  beforeEach(() => {
    roles.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => roles() !== null,
            hasAnyRole: (required?: readonly string[]) =>
              roles() !== null && (!required?.length || required.some((r) => roles()!.includes(r))),
          },
        },
      ],
    });
  });

  const run = (guard: typeof roleGuard, data: Record<string, unknown> = {}, url = '/order-lines') =>
    TestBed.runInInjectionContext(() =>
      guard({ data } as unknown as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  it('authGuard sends anonymous users to /login with the return URL', () => {
    const result = run(authGuard) as UrlTree;
    expect(result.toString()).toBe('/login?returnUrl=%2Forder-lines');
  });

  it('roleGuard lets a matching role through', () => {
    roles.set(['Admin']);
    expect(run(roleGuard, { roles: ACCESS.orderLines })).toBe(true);
  });

  it('roleGuard sends a missing role to /forbidden with context', () => {
    roles.set(['Manager']);
    const result = run(roleGuard, { roles: ACCESS.orderLines }) as UrlTree;
    expect(result.toString()).toBe('/forbidden?required=Admin&from=%2Forder-lines');
  });

  it('roleGuard without data.roles only needs a signed-in user', () => {
    roles.set(['Viewer']);
    expect(run(roleGuard)).toBe(true);
  });
});
