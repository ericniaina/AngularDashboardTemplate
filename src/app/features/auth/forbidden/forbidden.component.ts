import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideShieldAlert } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { TranslocoPipe } from '../../../core/i18n';

/** Rendered inside the shell, so the user keeps their menu. Context comes from query params. */
@Component({
  selector: 'app-forbidden',
  imports: [HlmButtonImports, HlmEmptyImports, NgIcon, RouterLink, TranslocoPipe],
  providers: [provideIcons({ lucideShieldAlert })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div hlmEmpty class="border">
      <div hlmEmptyHeader>
        <div hlmEmptyMedia variant="icon">
          <ng-icon name="lucideShieldAlert" />
        </div>
        <h1 hlmEmptyTitle>{{ 'auth.forbidden.title' | transloco }}</h1>
        <p hlmEmptyDescription>{{ 'auth.forbidden.message' | transloco }}</p>
      </div>
      <div hlmEmptyContent>
        @if (required()) {
          <p class="text-sm">
            {{ 'auth.forbidden.required' | transloco }}
            <span class="font-medium">{{ required() }}</span>
          </p>
        }
        @if (from()) {
          <p class="text-muted-foreground text-xs">
            {{ 'auth.forbidden.from' | transloco }} <code>{{ from() }}</code>
          </p>
        }
        <a hlmBtn routerLink="/dashboard">{{ 'auth.forbidden.back' | transloco }}</a>
      </div>
    </div>
  `,
})
export class ForbiddenComponent {
  readonly required = input<string>();
  readonly from = input<string>();
}
