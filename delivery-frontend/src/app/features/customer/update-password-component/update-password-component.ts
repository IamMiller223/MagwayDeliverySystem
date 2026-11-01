import {Component, inject, signal} from '@angular/core';
import {AuthService} from '../../../core/services/AuthService';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';

@Component({
  selector: 'app-update-password-component',
  imports: [
    RouterLink,
    ReactiveFormsModule
  ],
  templateUrl: './update-password-component.html',
  styleUrl: './update-password-component.css',
})
export class UpdatePasswordComponent {

  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // UI State Signals
  isSubmitting = signal<boolean>(false);
  isSuccessStep = signal<boolean>(false);
  errorMessage = signal<string>('');
  serverSuccessMessage = signal<string>('');

  // Independent visibility toggles for each password input
  showOldPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  passwordForm: FormGroup = this.fb.group(
    {
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordRulesValidator }
  );

  private passwordRulesValidator(group: AbstractControl): ValidationErrors | null {
    const oldPass = group.get('oldPassword')?.value;
    const newPass = group.get('newPassword')?.value;
    const confirmPass = group.get('confirmPassword')?.value;

    const errors: ValidationErrors = {};

    if (oldPass && newPass && oldPass === newPass) {
      errors['sameAsOld'] = true;
    }

    if (newPass && confirmPass && newPass !== confirmPass) {
      errors['passwordMismatch'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  toggleVisibility(field: 'old' | 'new' | 'confirm') {
    if (field === 'old') this.showOldPassword.update((v) => !v);
    if (field === 'new') this.showNewPassword.update((v) => !v);
    if (field === 'confirm') this.showConfirmPassword.update((v) => !v);
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.passwordForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  hasSameAsOldError(): boolean {
    const newControl = this.passwordForm.get('newPassword');
    return !!(
      this.passwordForm.errors?.['sameAsOld'] &&
      newControl &&
      (newControl.dirty || newControl.touched)
    );
  }

  hasMismatchError(): boolean {
    const confirmControl = this.passwordForm.get('confirmPassword');
    return !!(
      this.passwordForm.errors?.['passwordMismatch'] &&
      confirmControl &&
      (confirmControl.dirty || confirmControl.touched)
    );
  }

  onSubmit() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const user = this.authService.currentUser();
    if (!user?.userId) return;

    const { oldPassword, newPassword } = this.passwordForm.value;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService
      .updateUserPassword(user.userId, { oldPassword, newPassword })
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.serverSuccessMessage.set(res.message || 'Password updated successfully');
          this.isSuccessStep.set(true);
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            err?.error?.error ||
            err?.error?.message ||
            'Failed to update password. Please check your current password.'
          );
        },
      });
  }

  reLoginWithNewPassword() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

}
