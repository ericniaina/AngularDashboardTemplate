import type { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  /** true = leaving is fine (nothing pending, or the user confirmed). */
  canDeactivate(): boolean | Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  component.canDeactivate();
