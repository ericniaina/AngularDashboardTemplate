import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Group validator: at least one boolean control in the group is true → else `{ atLeastOneChecked: true }`. */
export const atLeastOneChecked: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const value = group.value as Record<string, unknown> | null;
  return value && Object.values(value).some((v) => v === true) ? null : { atLeastOneChecked: true };
};

/**
 * The value must not already exist (case-insensitive, trimmed) → else `{ unique: true }`.
 * `existing` is read on every validation, so a signal-backed list stays current.
 */
export function uniqueValue(
  existing: () => readonly string[],
  exclude?: () => string | null,
): ValidatorFn {
  const normalize = (v: string) => v.trim().toLocaleLowerCase();
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    const excluded = exclude?.();
    const taken = existing().some(
      (candidate) =>
        normalize(candidate) === normalize(value) &&
        (excluded === null ||
          excluded === undefined ||
          normalize(candidate) !== normalize(excluded)),
    );
    return taken ? { unique: true } : null;
  };
}

/** Whole-number ≥ min → else `{ min: { min, actual } }` (like Validators.min, but rejects decimals too). */
export function integerMin(min: number): ValidatorFn {
  return (control: AbstractControl<number | null>): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined) return null;
    return Number.isInteger(value) && value >= min ? null : { min: { min, actual: value } };
  };
}
