import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  const unauthorized = { status: 401, statusText: 'Unauthorized' };
  const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve));

  it('sends credentials and the CSRF header on BFF/API calls', () => {
    httpClient.get('/api/countries').subscribe();
    const req = http.expectOne('/api/countries');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-CSRF')).toBe('1');
    req.flush([]);
  });

  it('leaves other calls alone', () => {
    httpClient.get('/i18n/en.json').subscribe();
    const req = http.expectOne('/i18n/en.json');
    expect(req.request.withCredentials).toBe(false);
    expect(req.request.headers.has('X-CSRF')).toBe(false);
    req.flush({});
  });

  it('on 401 refreshes once, then retries the original request', async () => {
    const result = firstValueFrom(httpClient.get<string[]>('/api/countries'));

    http.expectOne('/api/countries').flush(null, unauthorized);
    const refresh = http.expectOne('/bff/refresh');
    expect(refresh.request.method).toBe('POST');
    expect(refresh.request.headers.get('X-CSRF')).toBe('1');
    refresh.flush(null, { status: 204, statusText: 'No Content' });
    await flushMicrotasks();
    http.expectOne('/api/countries').flush(['FR']);

    expect(await result).toEqual(['FR']);
  });

  it('shares one refresh between concurrent 401s', async () => {
    const a = firstValueFrom(httpClient.get('/api/a'));
    const b = firstValueFrom(httpClient.get('/api/b'));

    http.expectOne('/api/a').flush(null, unauthorized);
    http.expectOne('/api/b').flush(null, unauthorized);
    http.expectOne('/bff/refresh').flush(null);
    await flushMicrotasks();
    http.expectOne('/api/a').flush('A');
    http.expectOne('/api/b').flush('B');

    expect(await Promise.all([a, b])).toEqual(['A', 'B']);
  });

  it('when the refresh fails: clears the session and redirects to /login', async () => {
    const clear = vi.spyOn(TestBed.inject(AuthService), 'clearSession');
    const result = firstValueFrom(httpClient.get('/api/countries'));

    http.expectOne('/api/countries').flush(null, unauthorized);
    http.expectOne('/bff/refresh').flush(null, unauthorized);

    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(clear).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      ['/login'],
      expect.objectContaining({ queryParams: expect.any(Object) }),
    );
  });

  it('on 403 routes to /forbidden with the required roles and never retries', async () => {
    const result = firstValueFrom(httpClient.get('/api/restricted-demo'));

    http
      .expectOne('/api/restricted-demo')
      .flush({ requiredRoles: ['SuperAdmin'] }, { status: 403, statusText: 'Forbidden' });

    await expect(result).rejects.toMatchObject({ status: 403 });
    http.expectNone('/bff/refresh');
    expect(navigate).toHaveBeenCalledWith(['/forbidden'], {
      queryParams: expect.objectContaining({ required: 'SuperAdmin' }),
    });
  });
});
