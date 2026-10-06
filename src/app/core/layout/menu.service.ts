import { computed, inject, Injectable } from '@angular/core';
import { ACCESS } from '../auth/access-policy';
import { AuthService } from '../auth/auth.service';

export interface MenuItem {
  /** Translation key (root scope). */
  labelKey: string;
  /** Lucide icon name, registered by the shell. */
  icon: string;
  route: string;
  /** An `ACCESS` entry; absent = any authenticated user. */
  roles?: readonly string[];
}

export interface MenuSection {
  labelKey: string;
  items: MenuItem[];
}

export const MENU: readonly MenuSection[] = [
  {
    labelKey: 'menu.sections.overview',
    items: [{ labelKey: 'menu.dashboard', icon: 'lucideLayoutDashboard', route: '/dashboard' }],
  },
  {
    labelKey: 'menu.sections.examples',
    items: [
      {
        labelKey: 'menu.countries',
        icon: 'lucideGlobe',
        route: '/referential',
        roles: ACCESS.referential,
      },
      {
        labelKey: 'menu.employees',
        icon: 'lucideUsers',
        route: '/employees',
        roles: ACCESS.employees,
      },
      {
        labelKey: 'menu.onboarding',
        icon: 'lucideUserPlus',
        route: '/onboarding',
        roles: ACCESS.onboarding,
      },
      {
        labelKey: 'menu.orderLines',
        icon: 'lucideReceiptText',
        route: '/order-lines',
        roles: ACCESS.orderLines,
      },
    ],
  },
  {
    labelKey: 'menu.sections.administration',
    items: [
      {
        labelKey: 'menu.users',
        icon: 'lucideUserCog',
        route: '/admin/users',
        roles: ACCESS.adminUsers,
      },
    ],
  },
];

/** The static menu filtered by the current user's roles. Role logic stays in AuthService. */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly auth = inject(AuthService);

  readonly menu = computed<MenuSection[]>(() => {
    return MENU.map((section) => ({
      ...section,
      items: section.items.filter((item) => this.auth.hasAnyRole(item.roles)),
    })).filter((section) => section.items.length > 0);
  });

  /** Flat list, e.g. for the dashboard's quick links. */
  readonly items = computed(() => this.menu().flatMap((section) => section.items));
}
