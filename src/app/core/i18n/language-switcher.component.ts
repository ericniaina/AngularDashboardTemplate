import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideLanguages } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { type Lang, LANGS } from './i18n.config';

/** The one place outside the i18n wiring allowed to use TranslocoService directly. */
@Component({
  selector: 'app-language-switcher',
  imports: [HlmButtonImports, HlmDropdownMenuImports, NgIcon, TranslocoPipe],
  providers: [provideIcons({ lucideLanguages, lucideCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      hlmBtn
      variant="ghost"
      size="sm"
      [hlmDropdownMenuTrigger]="menu"
      align="end"
      [attr.aria-label]="'common.language.label' | transloco"
    >
      <ng-icon name="lucideLanguages" />
      <span class="uppercase">{{ active() }}</span>
    </button>

    <ng-template #menu>
      <hlm-dropdown-menu class="w-40">
        @for (lang of langs; track lang) {
          <button hlmDropdownMenuItem (triggered)="use(lang)">
            <span class="flex-1">{{ 'common.language.' + lang | transloco }}</span>
            @if (lang === active()) {
              <ng-icon name="lucideCheck" />
            }
          </button>
        }
      </hlm-dropdown-menu>
    </ng-template>
  `,
})
export class LanguageSwitcherComponent {
  private readonly transloco = inject(TranslocoService);

  protected readonly langs = LANGS;
  protected readonly active = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  protected use(lang: Lang): void {
    this.transloco.setActiveLang(lang);
  }
}
