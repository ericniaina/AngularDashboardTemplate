/**
 * Canvas charts need concrete colors, not CSS variables. Reads the theme tokens from <html> and
 * converts them to `rgb()/rgba()` through a 1×1 canvas: the tokens are `oklch()`, which Chart.js'
 * color helpers (hover shades, alpha) can't parse. Re-run when the theme changes.
 */
export interface ChartPalette {
  series: string[];
  text: string;
  mutedText: string;
  grid: string;
  surface: string;
}

export function readChartPalette(root: HTMLElement = document.documentElement): ChartPalette {
  const style = getComputedStyle(root);
  const token = (name: string) => toRgb(style.getPropertyValue(name).trim());
  return {
    series: ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'].map(token),
    text: token('--foreground'),
    mutedText: token('--muted-foreground'),
    grid: token('--border'),
    surface: token('--card'),
  };
}

let context: CanvasRenderingContext2D | null | undefined;

function toRgb(color: string): string {
  context ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!context || !color) return color;
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a! / 255).toFixed(3)})`;
}
