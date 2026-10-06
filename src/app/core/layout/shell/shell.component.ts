import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideGlobe,
  lucideLayoutDashboard,
  lucideLayoutGrid,
  lucideReceiptText,
  lucideUserCog,
  lucideUserPlus,
  lucideUsers,
} from '@ng-icons/lucide';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { LanguageSwitcherComponent, TranslocoPipe } from '../../i18n';
import { MenuService } from '../menu.service';
import { ThemeToggleComponent } from '../theme-toggle.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';

/** Signed-in layout: role-filtered sidebar + topbar + routed page. */
@Component({
  selector: 'app-shell',
  imports: [
    HlmSeparatorImports,
    HlmSidebarImports,
    LanguageSwitcherComponent,
    NgIcon,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ThemeToggleComponent,
    TranslocoPipe,
    UserMenuComponent,
  ],
  providers: [
    provideIcons({
      lucideGlobe,
      lucideLayoutDashboard,
      lucideLayoutGrid,
      lucideReceiptText,
      lucideUserCog,
      lucideUserPlus,
      lucideUsers,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  protected readonly menu = inject(MenuService).menu;
}
