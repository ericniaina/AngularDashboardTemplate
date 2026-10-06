import { ChangeDetectionStrategy, Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideI18nTesting } from '../../../core/i18n/testing';
import { LocaleService } from '../../../core/locale';
import { DateFieldComponent } from './date-field.component';

@Component({
  imports: [DateFieldComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-date-field [formControl]="control" inputId="date" max="2030-12-31" />`,
})
class HostComponent {
  readonly control = new FormControl<string | null>(null);
}

describe('DateFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let control: FormControl<string | null>;

  const input = () => fixture.nativeElement.querySelector('input#date') as HTMLInputElement;

  async function type(text: string) {
    const el = input();
    el.dispatchEvent(new Event('focus'));
    el.value = text;
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideI18nTesting()] });
    TestBed.inject(LocaleService).setLocale('fr');
    fixture = TestBed.createComponent(HostComponent);
    control = fixture.componentInstance.control;
    await fixture.whenStable();
  });

  it('emits the ISO value for a date typed in the locale format', async () => {
    await type('09/04/2026');
    expect(control.value).toBe('2026-04-09');
    expect(control.valid).toBe(true);
    expect(control.touched).toBe(true);
  });

  it('reads the same text as September 4 in en', async () => {
    TestBed.inject(LocaleService).setLocale('en');
    await fixture.whenStable();
    await type('09/04/2026');
    expect(control.value).toBe('2026-09-04');
  });

  it('flags an impossible date instead of rolling it over', async () => {
    await type('31/02/2026');
    expect(control.value).toBeNull();
    expect(control.hasError('invalidDate')).toBe(true);
    expect(input().value).toBe('31/02/2026'); // kept so the user can fix it
  });

  it('shows a written ISO value in the locale format', async () => {
    control.setValue('2021-03-15');
    await fixture.whenStable();
    expect(input().value).toBe('15/03/2021');
  });

  it('re-formats when the locale changes', async () => {
    control.setValue('2021-03-15');
    await fixture.whenStable();
    TestBed.inject(LocaleService).setLocale('en');
    await fixture.whenStable();
    expect(input().value).toBe('3/15/2021');
    expect(control.value).toBe('2021-03-15');
  });

  it('validates the ISO max bound', async () => {
    await type('01/01/2031');
    expect(control.value).toBe('2031-01-01');
    expect(control.hasError('maxDate')).toBe(true);
  });
});
