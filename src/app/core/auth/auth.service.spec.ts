import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import type { User } from './user.model';

const manager: User = {
  id: 'u-manager',
  name: 'Marc Manager',
  email: 'marc@example.com',
  roles: ['Manager'],
};

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function signIn(user: User) {
    const loaded = auth.loadSession();
    http.expectOne('/bff/user').flush(user);
    await loaded;
  }

  it('populates the user from /bff/user', async () => {
    await signIn(manager);
    expect(auth.user()).toEqual(manager);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('treats a 401 that survives the refresh attempt as anonymous, without redirecting', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    const loaded = auth.loadSession();
    http.expectOne('/bff/user').flush(null, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();
    http.expectOne('/bff/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    await loaded;

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).not.toHaveBeenCalledWith(['/login'], expect.anything());
  });

  it('checks roles', async () => {
    await signIn(manager);
    expect(auth.hasRole('Manager')).toBe(true);
    expect(auth.hasRole('Admin')).toBe(false);
    expect(auth.hasAnyRole(['Admin', 'Manager'])).toBe(true);
    expect(auth.hasAnyRole(['Admin'])).toBe(false);
  });

  it('treats a missing or empty role list as "any authenticated user"', async () => {
    expect(auth.hasAnyRole()).toBe(false);
    await signIn(manager);
    expect(auth.hasAnyRole()).toBe(true);
    expect(auth.hasAnyRole([])).toBe(true);
  });

  it('logout calls the BFF, clears the user and goes to /login', async () => {
    await signIn(manager);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const done = auth.logout();
    http.expectOne({ method: 'POST', url: '/bff/logout' }).flush(null);
    await done;

    expect(auth.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
