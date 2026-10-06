import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { translateGroup, TranslocoPipe } from '../../../core/i18n';
import { uniqueValue } from '../../../shared/validators/validators';
import { type Country, type CountryInput, type Region, REGIONS } from '../country.model';

export interface CountryDialogData {
  country: Country | null;
  readOnly: boolean;
  existingCodes: () => readonly string[];
  /** Persists the form value; rejects with the HTTP error (409 = duplicate code). */
  save: (input: CountryInput) => Promise<void>;
}

@Component({
  selector: 'app-country-dialog',
  imports: [
    HlmButtonImports,
    HlmDialogImports,
    HlmFieldImports,
    HlmInputImports,
    HlmSelectImports,
    HlmSpinnerImports,
    HlmSwitchImports,
    ReactiveFormsModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  templateUrl: './country-dialog.component.html',
})
export class CountryDialogComponent {
  private readonly dialogRef = inject<BrnDialogRef<'saved'>>(BrnDialogRef);
  protected readonly data = injectBrnDialogContext<CountryDialogData>();
  private readonly fb = inject(FormBuilder);

  protected readonly regions = REGIONS;
  protected readonly regionText = translateGroup<Region>('common.regions');
  private readonly errorText = translateGroup<'saveFailed'>('common.errors');
  protected readonly regionLabel = (region: Region | null) =>
    region ? this.regionText()[region] : '';

  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    code: this.fb.nonNullable.control(this.data.country?.code ?? '', [
      Validators.required,
      Validators.pattern(/^[A-Za-z]{2,3}$/),
      uniqueValue(this.data.existingCodes, () => this.data.country?.code ?? null),
    ]),
    name: this.fb.nonNullable.control(this.data.country?.name ?? '', [
      Validators.required,
      Validators.maxLength(60),
    ]),
    region: this.fb.control<Region | null>(this.data.country?.region ?? null, Validators.required),
    active: this.fb.nonNullable.control(this.data.country?.active ?? true),
  });

  constructor() {
    if (this.data.readOnly) this.form.disable();
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    try {
      await this.data.save({
        code: value.code.trim().toUpperCase(),
        name: value.name.trim(),
        region: value.region!,
        active: value.active,
      });
      this.dialogRef.close('saved');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.form.controls.code.setErrors({ unique: true });
        this.form.controls.code.markAsTouched();
      } else if (!(
        error instanceof HttpErrorResponse &&
        (error.status === 401 || error.status === 403)
      )) {
        toast.error(this.errorText().saveFailed);
      }
    } finally {
      this.saving.set(false);
    }
  }
}
