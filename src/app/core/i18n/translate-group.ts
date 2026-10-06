import { inject, InjectionToken, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { combineLatest, map, of, switchMap } from 'rxjs';

/** The feature scope of the current route, provided by `i18nScope()`. */
export const I18N_SCOPE = new InjectionToken<string>('I18N_SCOPE');

/**
 * A reactive, typed group of translations for TypeScript code (grid headers, chart labels, toasts):
 *
 *   readonly t = translateGroup<'name' | 'code'>('countries.columns');
 *   headerName: this.t().name
 *
 * Re-emits on language change. Must be called in an injection context (field initializer).
 */
export function translateGroup<K extends string>(path: string): Signal<Record<K, string>> {
  const transloco = inject(TranslocoService);
  const scope = inject(I18N_SCOPE, { optional: true });

  const read = () => transloco.translateObject(path) as Record<K, string>;

  const group$ = transloco.langChanges$.pipe(
    switchMap((lang) =>
      combineLatest([transloco.load(lang), scope ? transloco.load(`${scope}/${lang}`) : of(null)]),
    ),
    map(read),
  );

  return toSignal(group$, { initialValue: read() });
}

/**
 * Fills `{name}` placeholders in a string read through `translateGroup()`. (Single braces on purpose:
 * Transloco would blank out `{{name}}` when the group is read without params.)
 */
export function interpolate(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
