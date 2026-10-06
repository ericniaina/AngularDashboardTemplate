import { CdkStepper } from '@angular/cdk/stepper';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';

/**
 * Tailwind rendering of Angular CDK's stepper (spartan has none). Steps are `<cdk-step>` children
 * with `[stepControl]` and `[label]`; linear mode and navigation come from `CdkStepper`.
 */
@Component({
  selector: 'app-stepper',
  imports: [NgIcon, NgTemplateOutlet],
  providers: [
    { provide: CdkStepper, useExisting: StepperComponent },
    provideIcons({ lucideCheck }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './stepper.component.html',
})
export class StepperComponent extends CdkStepper {
  /** Tailwind classes for a step's round indicator. */
  protected indicatorClass(index: number, completed: boolean): string {
    const base =
      'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors';
    if (index === this.selectedIndex)
      return `${base} border-primary text-primary ring-3 ring-primary/20`;
    if (completed) return `${base} border-primary bg-primary text-primary-foreground`;
    return `${base} border-border text-muted-foreground`;
  }
}
