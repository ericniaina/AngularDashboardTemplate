import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideTransloco, type Translation, type TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';

class InlineLoader implements TranslocoLoader {
  constructor(private readonly translations: Record<string, Translation>) {}

  getTranslation(lang: string) {
    return of(this.translations[lang] ?? {});
  }
}

/** For specs: Transloco with in-memory translations (missing keys render as the key). */
export function provideI18nTesting(
  translations: Record<string, Translation> = {},
): EnvironmentProviders {
  return makeEnvironmentProviders(
    provideTransloco({
      config: {
        availableLangs: ['en', 'fr'],
        defaultLang: 'en',
        missingHandler: { logMissingKey: false },
        scopes: { autoPrefixKeys: false },
      },
      loader: class extends InlineLoader {
        constructor() {
          super(translations);
        }
      },
    }),
  );
}
