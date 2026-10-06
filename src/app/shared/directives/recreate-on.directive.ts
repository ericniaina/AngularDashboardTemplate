import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';

/**
 * Destroys and re-creates its content whenever the bound value changes:
 *
 *   <ag-grid-angular *appRecreateOn="locale()" … />
 *
 * For third-party widgets that read some options only at creation (AG Grid's `localeText`).
 */
@Directive({ selector: '[appRecreateOn]' })
export class RecreateOnDirective {
  private readonly template = inject(TemplateRef);
  private readonly container = inject(ViewContainerRef);

  readonly appRecreateOn = input<unknown>();

  constructor() {
    effect(() => {
      this.appRecreateOn();
      this.container.clear();
      this.container.createEmbeddedView(this.template);
    });
  }
}
