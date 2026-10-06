import { BreakpointObserver } from '@angular/cdk/layout';
import { CdkStep } from '@angular/cdk/stepper';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { firstValueFrom, map } from 'rxjs';
import type { Role } from '../../core/auth';
import { translateGroup, TranslocoPipe } from '../../core/i18n';
import { DateFieldComponent } from '../../shared/components/date-field/date-field.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StepperComponent } from '../../shared/components/stepper/stepper.component';
import { todayIso } from '../../shared/date/iso-date.util';
import { DepartmentsService } from '../../shared/lookups/departments.service';
import { LocalizedDatePipe } from '../../shared/pipes/localized-date.pipe';
import { atLeastOneChecked } from '../../shared/validators/validators';

const ROLES: Role[] = ['Admin', 'Manager', 'Viewer'];

@Component({
  selector: 'app-onboarding',
  imports: [
    CdkStep,
    DateFieldComponent,
    HlmButtonImports,
    HlmCardImports,
    HlmCheckboxImports,
    HlmFieldImports,
    HlmInputImports,
    HlmSelectImports,
    HlmSpinnerImports,
    LocalizedDatePipe,
    NgIcon,
    PageHeaderComponent,
    ReactiveFormsModule,
    RouterLink,
    StepperComponent,
    TranslocoPipe,
  ],
  providers: [provideIcons({ lucideCircleCheck })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding.component.html',
})
export class OnboardingComponent {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  protected readonly departments = inject(DepartmentsService);

  private readonly stepper = viewChild.required(StepperComponent);

  protected readonly roles = ROLES;
  protected readonly today = todayIso();
  protected readonly stepLabels = translateGroup<'personal' | 'job' | 'access' | 'review'>(
    'onboarding.steps',
  );
  private readonly messages = translateGroup<'submitFailed'>('onboarding.messages');
  protected readonly departmentLabel = (id: string | null) =>
    (id && this.departments.nameById().get(id)) || '';

  protected readonly narrow = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 767px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly form = this.fb.group({
    personal: this.fb.group({
      firstName: this.fb.nonNullable.control('', Validators.required),
      lastName: this.fb.nonNullable.control('', Validators.required),
      email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
      birthDate: this.fb.control<string | null>(null, Validators.required),
    }),
    job: this.fb.group({
      departmentId: this.fb.control<string | null>(null, Validators.required),
      jobTitle: this.fb.nonNullable.control('', Validators.required),
      startDate: this.fb.control<string | null>(null, Validators.required),
    }),
    access: this.fb.nonNullable.group(
      { Admin: false, Manager: false, Viewer: false },
      { validators: atLeastOneChecked },
    ),
  });

  /** Signal view of the form for the review step. */
  protected readonly value = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    {
      initialValue: this.form.getRawValue(),
    },
  );
  protected readonly selectedRoles = computed(() =>
    ROLES.filter((role) => this.value().access[role]),
  );

  protected readonly accessAttempted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly done = signal(false);

  private readonly stepGroups = [
    this.form.controls.personal,
    this.form.controls.job,
    this.form.controls.access,
  ];

  /** "Next" reveals the step's errors instead of silently refusing to move. */
  protected next(): void {
    const index = this.stepper().selectedIndex;
    const group = this.stepGroups[index];
    if (group?.invalid) {
      group.markAllAsTouched();
      if (group === this.form.controls.access) this.accessAttempted.set(true);
      return;
    }
    this.stepper().next();
  }

  protected previous(): void {
    this.stepper().previous();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.submitting.set(true);
    try {
      await firstValueFrom(
        this.http.post('/api/onboarding', {
          personal: value.personal,
          job: value.job,
          access: { roles: ROLES.filter((role) => value.access[role]) },
        }),
      );
      this.done.set(true);
    } catch (error) {
      if (!(error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403))) {
        toast.error(this.messages().submitFailed);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected startAnother(): void {
    this.form.reset();
    this.accessAttempted.set(false);
    this.done.set(false);
    // The stepper is re-created by the @if, starting at step 1.
  }
}
