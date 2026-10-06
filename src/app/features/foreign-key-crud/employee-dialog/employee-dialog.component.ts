import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { translateGroup, TranslocoPipe } from '../../../core/i18n';
import { DateFieldComponent } from '../../../shared/components/date-field/date-field.component';
import { todayIso } from '../../../shared/date/iso-date.util';
import { DepartmentsService } from '../../../shared/lookups/departments.service';
import type { Employee, EmployeeInput } from '../employee.model';

export interface EmployeeDialogData {
  employee: Employee | null;
  save: (input: EmployeeInput) => Promise<void>;
}

@Component({
  selector: 'app-employee-dialog',
  imports: [
    DateFieldComponent,
    HlmButtonImports,
    HlmDialogImports,
    HlmFieldImports,
    HlmInputImports,
    HlmSelectImports,
    HlmSpinnerImports,
    ReactiveFormsModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  templateUrl: './employee-dialog.component.html',
})
export class EmployeeDialogComponent {
  private readonly dialogRef = inject<BrnDialogRef<'saved'>>(BrnDialogRef);
  protected readonly data = injectBrnDialogContext<EmployeeDialogData>();
  private readonly fb = inject(FormBuilder);
  protected readonly departments = inject(DepartmentsService);
  private readonly errorText = translateGroup<'saveFailed'>('common.errors');

  protected readonly today = todayIso();
  protected readonly departmentLabel = (id: string | null) =>
    (id && this.departments.nameById().get(id)) || '';
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    firstName: this.fb.nonNullable.control(this.data.employee?.firstName ?? '', [
      Validators.required,
      Validators.maxLength(50),
    ]),
    lastName: this.fb.nonNullable.control(this.data.employee?.lastName ?? '', [
      Validators.required,
      Validators.maxLength(50),
    ]),
    email: this.fb.nonNullable.control(this.data.employee?.email ?? '', [
      Validators.required,
      Validators.email,
    ]),
    departmentId: this.fb.control<string | null>(
      this.data.employee?.departmentId ?? null,
      Validators.required,
    ),
    /** ISO string; the date field does the locale parsing/formatting. */
    hireDate: this.fb.control<string | null>(
      this.data.employee?.hireDate ?? null,
      Validators.required,
    ),
  });

  /** Shown under the field to make the "value stays ISO" contract visible in the demo. */
  protected readonly storedHireDate = toSignal(this.form.controls.hireDate.valueChanges, {
    initialValue: this.form.controls.hireDate.value,
  });

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
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        email: value.email.trim(),
        departmentId: value.departmentId!,
        hireDate: value.hireDate!,
      });
      this.dialogRef.close('saved');
    } catch (error) {
      if (!(error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403))) {
        toast.error(this.errorText().saveFailed);
      }
    } finally {
      this.saving.set(false);
    }
  }
}
