import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { ThemeService } from './core/layout/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HlmToasterImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <!-- Deferred: the toaster is only needed once something happens, so it stays out of the initial bundle. -->
    @defer (on idle) {
      <hlm-toaster position="bottom-right" [theme]="toasterTheme()" />
    }
  `,
})
export class App {
  private readonly theme = inject(ThemeService);
  protected readonly toasterTheme = computed(() => (this.theme.isDark() ? 'dark' : 'light'));
}
