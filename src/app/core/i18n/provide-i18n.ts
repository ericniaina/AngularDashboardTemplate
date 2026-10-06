import { HttpClient } from '@angular/common/http';
import {
  DestroyRef,
  DOCUMENT,
  type EnvironmentProviders,
  inject,
  Injectable,
  isDevMode,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  provideTransloco,
  type Translation,
  type TranslocoLoader,
  TranslocoService,
} from '@jsverse/transloco';
import { firstValueFrom, switchMap } from 'rxjs';
import { LocaleService } from '../locale';
import { DEFAULT_LANG, initialLang, type Lang, LANGS, persistLang } from './i18n.config';

/** Root strings: /i18n/<lang>.json. Scopes: /i18n/<scope>/<lang>.json (Transloco passes "scope/lang"). */
@Injectable({ providedIn: 'root' })
class HttpTranslationLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(path: string) {
    return this.http.get<Translation>(`/i18n/${path}.json`);
  }
}

/** Called once from app.config.ts. The only place Transloco is configured. */
export function provideI18n(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTransloco({
      config: {
        availableLangs: [...LANGS],
        defaultLang: DEFAULT_LANG,
        fallbackLang: DEFAULT_LANG,
        missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        // Keys are always written in full (`countries.columns.name`), in templates and TS alike.
        scopes: { autoPrefixKeys: false },
      },
      loader: HttpTranslationLoader,
    }),
    provideAppInitializer(async () => {
      const transloco = inject(TranslocoService);
      const locale = inject(LocaleService);
      const document = inject(DOCUMENT);
      const destroyRef = inject(DestroyRef);

      // Keep the display locale, <html lang>, stored choice and calendar labels in step with the language.
      transloco.langChanges$
        .pipe(
          switchMap((lang) => transloco.selectTranslateObject('common.calendar', {}, lang)),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe((labels: { previousMonth: string; nextMonth: string }) => {
          const lang = transloco.getActiveLang() as Lang;
          locale.setLocale(lang);
          locale.setCalendarLabels(labels);
          document.documentElement.lang = lang;
          persistLang(lang);
        });

      const lang = initialLang();
      transloco.setActiveLang(lang);
      // Root strings are loaded before the first render, so no raw keys flash.
      await firstValueFrom(transloco.load(lang));
    }),
  ]);
}
