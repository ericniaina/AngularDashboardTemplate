import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHlmSidebarConfig } from '@spartan-ng/helm/sidebar';
import { routes } from './app.routes';
import { AuthService, authInterceptor } from './core/auth';
import { provideI18n } from './core/i18n';
import { ThemeService } from './core/layout/theme.service';

// Locale data for every shipped language ('en' is built in). Required by formatDate/DecimalPipe.
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideI18n(),
    provideAppInitializer(() => inject(AuthService).loadSession()),
    // Apply the stored/OS theme before the first paint of any page.
    provideAppInitializer(() => void inject(ThemeService)),
    provideHlmSidebarConfig({ closeMobileSidebarOnMenuButtonClick: true }),
  ],
};
