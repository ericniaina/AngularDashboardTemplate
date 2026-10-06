import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;

  // jsdom has no matchMedia.
  function mockPrefersDark(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({ matches } as MediaQueryList),
    });
  }

  beforeEach(() => {
    localStorage.clear();
    root.classList.remove('dark');
    TestBed.resetTestingModule();
  });

  afterEach(() => vi.restoreAllMocks());

  it('defaults to the OS preference when nothing is stored', () => {
    mockPrefersDark(true);
    expect(TestBed.inject(ThemeService).isDark()).toBe(true);
  });

  it('prefers the stored choice over the OS preference', () => {
    mockPrefersDark(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(TestBed.inject(ThemeService).isDark()).toBe(false);
  });

  it('toggling sets the dark class, color-scheme and persists the choice', () => {
    mockPrefersDark(false);
    const theme = TestBed.inject(ThemeService);

    theme.toggle();
    TestBed.tick();

    expect(root.classList.contains('dark')).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});
