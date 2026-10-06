import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { computed, DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { User } from './user.model';

/** Set on requests whose 401 must not redirect to /login (the bootstrap `/bff/user` call). */
export const SKIP_LOGIN_REDIRECT = new HttpContextToken<boolean>(() => false);

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  /** Called once at bootstrap. A 401 (after the interceptor's refresh attempt) means anonymous. */
  async loadSession(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.http.get<User>('/bff/user', {
          context: new HttpContext().set(SKIP_LOGIN_REDIRECT, true),
        }),
      );
      this._user.set(user);
    } catch {
      this._user.set(null);
    }
  }

  /** Full-page navigation: the BFF drives the SSO redirect dance, not an XHR. */
  login(returnUrl: string): void {
    this.document.location.assign(`/bff/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>('/bff/logout', null));
    } finally {
      this.clearSession();
      await this.router.navigate(['/login']);
    }
  }

  /** Forget the local user state (the cookie is the BFF's business). */
  clearSession(): void {
    this._user.set(null);
  }

  hasRole(role: string): boolean {
    return this._user()?.roles.includes(role) ?? false;
  }

  /** No roles (or an empty list) means "any authenticated user". */
  hasAnyRole(roles?: readonly string[]): boolean {
    const user = this._user();
    if (!user) return false;
    if (!roles || roles.length === 0) return true;
    return roles.some((role) => user.roles.includes(role));
  }
}
