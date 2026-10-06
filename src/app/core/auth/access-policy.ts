import type { Role } from './user.model';

/**
 * Who may access what, declared once. Route `data.roles`, menu items and in-page checks all
 * reference these lists; never hardcode a role list elsewhere. The BFF enforces the same rules.
 */
export const ACCESS = {
  referential: ['Admin', 'Manager', 'Viewer'],
  referentialWrite: ['Admin', 'Manager'],
  employees: ['Admin', 'Manager'],
  onboarding: ['Admin', 'Manager'],
  orderLines: ['Admin'],
  adminUsers: ['Admin'],
} as const satisfies Record<string, readonly Role[]>;
