import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

export const THEME_STORAGE_KEY = 'app.theme';

/**
 * Dark mode = a `dark` class on <html> (plus `color-scheme`). Every color is a CSS variable that
 * flips under `.dark`, so nothing else needs to know. Persisted as a UI preference, not session state.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly _isDark = signal(this.initialIsDark());
  readonly isDark = this._isDark.asReadonly();

  constructor() {
    effect(() => {
      const dark = this._isDark();
      const root = this.document.documentElement;
      root.classList.toggle('dark', dark);
      root.style.colorScheme = dark ? 'dark' : 'light';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
      } catch {
        // storage unavailable: the choice just won't survive a reload
      }
    });
  }

  toggle(): void {
    this._isDark.update((dark) => !dark);
  }

  setDark(dark: boolean): void {
    this._isDark.set(dark);
  }

  private initialIsDark(): boolean {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored === 'dark';
    } catch {
      // fall through to the OS preference
    }
    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
