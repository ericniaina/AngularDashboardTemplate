import { inject } from '@angular/core';
import type { ResolveFn, Route } from '@angular/router';
import { provideTranslocoScope, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { I18N_SCOPE } from './translate-group';

/**
 * Spread into a feature route: `{ path: 'x', ...i18nScope('countries'), loadComponent: … }`.
 * Provides the scope to the feature and loads `/i18n/<scope>/<lang>.json` before the route
 * activates, so templates never flash raw keys.
 */
export function i18nScope(scope: string): Pick<Route, 'providers' | 'resolve'> {
  const preload: ResolveFn<boolean> = async () => {
    const transloco = inject(TranslocoService);
    await firstValueFrom(transloco.load(`${scope}/${transloco.getActiveLang()}`));
    return true;
  };

  return {
    providers: [provideTranslocoScope(scope), { provide: I18N_SCOPE, useValue: scope }],
    resolve: { i18n: preload },
  };
}
