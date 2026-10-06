import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { MenuService } from './menu.service';

describe('MenuService', () => {
  const roles = signal<string[]>([]);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            hasAnyRole: (required?: readonly string[]) =>
              !required?.length || required.some((r) => roles().includes(r)),
          },
        },
      ],
    });
  });

  const routes = () =>
    TestBed.inject(MenuService)
      .items()
      .map((item) => item.route);

  it('shows everything to an Admin', () => {
    roles.set(['Admin']);
    expect(routes()).toEqual([
      '/dashboard',
      '/referential',
      '/employees',
      '/onboarding',
      '/order-lines',
      '/admin/users',
    ]);
  });

  it('filters by role and drops sections that end up empty', () => {
    roles.set(['Viewer']);
    const menu = TestBed.inject(MenuService);
    expect(routes()).toEqual(['/dashboard', '/referential']);
    expect(menu.menu().map((s) => s.labelKey)).not.toContain('menu.sections.administration');
  });

  it('recomputes when the roles change', () => {
    roles.set(['Viewer']);
    const menu = TestBed.inject(MenuService);
    expect(menu.items()).toHaveLength(2);
    roles.set(['Manager']);
    expect(menu.items().map((i) => i.route)).toEqual([
      '/dashboard',
      '/referential',
      '/employees',
      '/onboarding',
    ]);
  });
});
