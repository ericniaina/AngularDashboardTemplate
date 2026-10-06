import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogOut } from '@ng-icons/lucide';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { AuthService } from '../../auth/auth.service';
import { TranslocoPipe } from '../../i18n';

@Component({
  selector: 'app-user-menu',
  imports: [
    HlmAvatarImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDropdownMenuImports,
    NgIcon,
    TranslocoPipe,
  ],
  providers: [provideIcons({ lucideLogOut })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-menu.component.html',
})
export class UserMenuComponent {
  private readonly auth = inject(AuthService);

  protected readonly user = this.auth.user;
  protected readonly initials = computed(() =>
    (this.user()?.name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join(''),
  );

  protected signOut(): void {
    void this.auth.logout();
  }
}
