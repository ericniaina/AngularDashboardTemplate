import { FormControl, FormGroup } from '@angular/forms';
import { atLeastOneChecked, integerMin, uniqueValue } from './validators';

describe('validators', () => {
  it('atLeastOneChecked', () => {
    const group = new FormGroup(
      { a: new FormControl(false), b: new FormControl(false) },
      { validators: atLeastOneChecked },
    );
    expect(group.errors).toEqual({ atLeastOneChecked: true });
    group.controls.b.setValue(true);
    expect(group.errors).toBeNull();
  });

  describe('uniqueValue', () => {
    let existing = ['FR', 'DE'];
    const control = (value: string, exclude?: string) =>
      new FormControl(
        value,
        uniqueValue(() => existing, exclude ? () => exclude : undefined),
      );

    beforeEach(() => (existing = ['FR', 'DE']));

    it('flags an existing value, case-insensitively and trimmed', () => {
      expect(control(' fr ').errors).toEqual({ unique: true });
      expect(control('ES').errors).toBeNull();
    });

    it('ignores the record being edited', () => {
      expect(control('FR', 'FR').errors).toBeNull();
      expect(control('DE', 'FR').errors).toEqual({ unique: true });
    });

    it('reads the current list on every validation', () => {
      const c = control('ES');
      existing = [...existing, 'ES'];
      c.updateValueAndValidity();
      expect(c.errors).toEqual({ unique: true });
    });

    it('leaves empty values to Validators.required', () => {
      expect(control('').errors).toBeNull();
    });
  });

  it('integerMin', () => {
    const c = new FormControl<number | null>(0, integerMin(1));
    expect(c.errors).toEqual({ min: { min: 1, actual: 0 } });
    c.setValue(1.5);
    expect(c.errors).not.toBeNull();
    c.setValue(3);
    expect(c.errors).toBeNull();
  });
});
