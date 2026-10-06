import type { Routes } from '@angular/router';
import { ACCESS, authGuard, guestGuard, roleGuard } from './core/auth';
import { i18nScope } from './core/i18n';
import { ShellComponent } from './core/layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        ...i18nScope('dashboard'),
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'referential',
        canActivate: [roleGuard],
        data: { roles: ACCESS.referential },
        ...i18nScope('countries'),
        loadComponent: () =>
          import('./features/referential-crud/countries-page.component').then(
            (m) => m.CountriesPageComponent,
          ),
      },
      {
        path: 'employees',
        canActivate: [roleGuard],
        data: { roles: ACCESS.employees },
        ...i18nScope('employees'),
        loadComponent: () =>
          import('./features/foreign-key-crud/employees-page.component').then(
            (m) => m.EmployeesPageComponent,
          ),
      },
      {
        path: 'onboarding',
        canActivate: [roleGuard],
        data: { roles: ACCESS.onboarding },
        ...i18nScope('onboarding'),
        loadComponent: () =>
          import('./features/multistep-form/onboarding.component').then(
            (m) => m.OnboardingComponent,
          ),
      },
      {
        path: 'order-lines',
        canActivate: [roleGuard],
        data: { roles: ACCESS.orderLines },
        ...i18nScope('orders'),
        loadChildren: () =>
          import('./features/interactive-grid/order-lines.routes').then(
            (m) => m.ORDER_LINES_ROUTES,
          ),
      },
      {
        path: 'admin/users',
        canActivate: [roleGuard],
        data: { roles: ACCESS.adminUsers },
        ...i18nScope('admin'),
        loadComponent: () =>
          import('./features/admin/users-page.component').then((m) => m.UsersPageComponent),
      },
      {
        path: 'forbidden',
        loadComponent: () =>
          import('./features/auth/forbidden/forbidden.component').then((m) => m.ForbiddenComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
