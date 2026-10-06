import {
  HttpClient,
  HttpErrorResponse,
  type HttpEvent,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, map, type Observable, shareReplay, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService, SKIP_LOGIN_REDIRECT } from './auth.service';

const REFRESH_URL = '/bff/refresh';

const isBffCall = (url: string) => url.startsWith('/bff/') || url.startsWith('/api/');

/** Shares one in-flight `/bff/refresh` between concurrent 401s. */
@Injectable({ providedIn: 'root' })
export class SessionRefresher {
  private readonly http = inject(HttpClient);
  private inFlight: Observable<void> | null = null;

  refresh(): Observable<void> {
    this.inFlight ??= this.http.post(REFRESH_URL, null).pipe(
      map(() => undefined),
      finalize(() => (this.inFlight = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.inFlight;
  }
}

/**
 * The one interceptor for BFF calls: credentials + CSRF header on every call, one refresh-and-retry
 * on 401, and 403 routed to /forbidden (an authorization failure, never retried).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isBffCall(req.url)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const refresher = inject(SessionRefresher);

  const authReq = req.clone({ withCredentials: true, setHeaders: { 'X-CSRF': '1' } });

  const onForbidden = (error: HttpErrorResponse) => {
    const required = (error.error as { requiredRoles?: string[] } | null)?.requiredRoles;
    void router.navigate(['/forbidden'], {
      queryParams: { required: required?.join(', ') || null, from: router.url },
    });
  };

  const onSessionExpired = () => {
    auth.clearSession();
    if (!req.context.get(SKIP_LOGIN_REDIRECT)) {
      void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    }
  };

  const handle403 = (request$: Observable<HttpEvent<unknown>>) =>
    request$.pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 403) onForbidden(error);
        return throwError(() => error);
      }),
    );

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);

      if (error.status === 401 && req.url !== REFRESH_URL) {
        return refresher.refresh().pipe(
          catchError(() => {
            onSessionExpired();
            return throwError(() => error);
          }),
          // Retry once; a second 401 is not refreshed again.
          switchMap(() => handle403(next(authReq))),
        );
      }
      if (error.status === 403) onForbidden(error);
      return throwError(() => error);
    }),
  );
};
