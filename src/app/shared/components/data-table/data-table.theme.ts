import { themeQuartz } from 'ag-grid-community';

/**
 * AG Grid theme built from the app's CSS variables, so it matches spartan cards/inputs and flips
 * with `.dark` without any TypeScript involvement.
 */
export const dataTableTheme = themeQuartz.withParams({
  accentColor: 'var(--primary)',
  backgroundColor: 'var(--card)',
  foregroundColor: 'var(--card-foreground)',
  textColor: 'var(--card-foreground)',
  subtleTextColor: 'var(--muted-foreground)',
  borderColor: 'var(--border)',
  chromeBackgroundColor: 'var(--card)',
  headerBackgroundColor: 'var(--muted)',
  headerTextColor: 'var(--muted-foreground)',
  headerFontWeight: 500,
  oddRowBackgroundColor: 'var(--card)',
  rowHoverColor: 'color-mix(in oklch, var(--muted) 70%, transparent)',
  selectedRowBackgroundColor: 'color-mix(in oklch, var(--primary) 8%, transparent)',
  inputBackgroundColor: 'var(--background)',
  inputBorder: { color: 'var(--input)' },
  inputFocusBorder: { color: 'var(--ring)' },
  menuBackgroundColor: 'var(--popover)',
  menuTextColor: 'var(--popover-foreground)',
  focusShadow: '0 0 0 3px color-mix(in oklch, var(--ring) 50%, transparent)',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  headerFontSize: 13,
  borderRadius: 'calc(var(--radius) * 0.8)',
  wrapperBorderRadius: 'var(--radius)',
  spacing: 7,
  browserColorScheme: 'inherit',
});
