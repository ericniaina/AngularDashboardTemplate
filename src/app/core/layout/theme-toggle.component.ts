import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { TranslocoPipe } from '../i18n';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [HlmButtonImports, NgIcon, TranslocoPipe],
  providers: [provideIcons({ lucideMoon, lucideSun })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      hlmBtn
      variant="ghost"
      size="icon"
      [attr.aria-label]="(theme.isDark() ? 'common.theme.light' : 'common.theme.dark') | transloco"
      [attr.aria-pressed]="theme.isDark()"
      (click)="theme.toggle()"
    >
      <ng-icon [name]="theme.isDark() ? 'lucideSun' : 'lucideMoon'" />
    </button>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
}
