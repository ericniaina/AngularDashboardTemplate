import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';
import { BrnDialogDescription } from '@spartan-ng/brain/dialog';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmDialogDescription]',
  hostDirectives: [BrnDialogDescription],
  host: { 'data-slot': 'dialog-description' },
})
export class HlmDialogDescription {
  constructor() {
    classes(
      () =>
        'text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3',
    );

    // House change: dialogs opened through HlmDialogService pass `ariaDescribedBy: null`, which stops
    // brain from rewriting the CDK container's config mid change detection (NG0100 in dev mode).
    // Link the description to its dialog here instead, once rendered.
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => {
      const element = host.nativeElement;
      const container = element.closest('cdk-dialog-container');
      if (container && element.id && !container.hasAttribute('aria-describedby')) {
        container.setAttribute('aria-describedby', element.id);
      }
    });
  }
}
