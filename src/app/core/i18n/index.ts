// The only import path the app uses for i18n. Nothing outside core/i18n imports @jsverse/transloco.
export { TranslocoPipe } from '@jsverse/transloco';
export { i18nScope } from './i18n-scope';
export { LANGS, type Lang } from './i18n.config';
export { LanguageSwitcherComponent } from './language-switcher.component';
export { provideI18n } from './provide-i18n';
export { interpolate, translateGroup } from './translate-group';
