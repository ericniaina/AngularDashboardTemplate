import { inject, Injectable } from '@angular/core';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent, type ConfirmDialogData } from './confirm-dialog.component';

/** `await confirm.ask({...})` → true only if the user clicked the confirm button. */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(HlmDialogService);

  async ask(data: ConfirmDialogData): Promise<boolean> {
    const ref = this.dialog.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      context: data,
      role: 'alertdialog',
      showCloseButton: false,
      contentClass: 'sm:max-w-md',
    });
    return (await firstValueFrom(ref.closed$)) === true;
  }
}
