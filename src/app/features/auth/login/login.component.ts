import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogIn } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { AuthService } from '../../../core/auth';
import { LanguageSwitcherComponent, TranslocoPipe } from '../../../core/i18n';
import { ThemeToggleComponent } from '../../../core/layout/theme-toggle.component';

@Component({
  selector: 'app-login',
  imports: [
    HlmButtonImports,
    HlmCardImports,
    LanguageSwitcherComponent,
    NgIcon,
    ThemeToggleComponent,
    TranslocoPipe,
  ],
  providers: [provideIcons({ lucideLogIn })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-muted relative flex min-h-svh items-center justify-center p-4">
      <div class="absolute end-4 top-4 flex items-center gap-2">
        <app-language-switcher />
        <app-theme-toggle />
      </div>

      <section hlmCard class="w-full max-w-sm">
        <div hlmCardHeader class="justify-items-center text-center">
          <img src="logo.svg" alt="" width="80" height="80" class="mb-2 size-20" />
          <h1 hlmCardTitle class="text-xl">{{ 'app.title' | transloco }}</h1>
          <p hlmCardDescription>{{ 'auth.login.description' | transloco }}</p>
        </div>
        <div hlmCardContent class="flex flex-col gap-4">
          <button hlmBtn size="lg" class="w-full" type="button" (click)="signIn()">
            <ng-icon name="lucideLogIn" />
            {{ 'auth.login.signIn' | transloco }}
          </button>
          <p class="text-muted-foreground text-center text-xs">
            {{ 'auth.login.hint' | transloco }}
          </p>
        </div>
      </section>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);

  /** Deep link to come back to after sign-in (query param). */
  readonly returnUrl = input<string>();

  protected signIn(): void {
    this.auth.login(this.returnUrl() || '/dashboard');
  }
}
