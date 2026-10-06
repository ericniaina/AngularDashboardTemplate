import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Title + subtitle on the left, actions on the right (wrapping on narrow screens).
 * Badges next to the title go in `[pageBadge]`; buttons are default content.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mb-6 flex flex-wrap items-start justify-between gap-4' },
  template: `
    <div class="flex min-w-0 flex-col gap-1">
      <div class="flex flex-wrap items-center gap-2">
        <h1 class="text-2xl font-semibold tracking-tight">{{ title() }}</h1>
        <ng-content select="[pageBadge]" />
      </div>
      @if (subtitle()) {
        <p class="text-muted-foreground text-sm">{{ subtitle() }}</p>
      }
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <ng-content />
    </div>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
