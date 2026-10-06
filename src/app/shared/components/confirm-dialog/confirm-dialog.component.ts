import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

export interface ConfirmDialogData {
  /** All texts already translated. */
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [HlmButtonImports, HlmDialogImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <hlm-dialog-header>
      <h2 hlmDialogTitle>{{ data.title }}</h2>
      <p hlmDialogDescription>{{ data.message }}</p>
    </hlm-dialog-header>
    <hlm-dialog-footer>
      <button hlmBtn variant="outline" type="button" (click)="close(false)">
        {{ data.cancelLabel }}
      </button>
      <button
        hlmBtn
        type="button"
        [variant]="data.destructive ? 'destructive' : 'default'"
        (click)="close(true)"
      >
        {{ data.confirmLabel }}
      </button>
    </hlm-dialog-footer>
  `,
})
export class ConfirmDialogComponent {
  private readonly dialogRef = inject<BrnDialogRef<boolean>>(BrnDialogRef);
  protected readonly data = injectBrnDialogContext<ConfirmDialogData>();

  protected close(result: boolean): void {
    this.dialogRef.close(result);
  }
}
