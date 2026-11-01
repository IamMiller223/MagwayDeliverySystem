import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/AuthService';

@Component({
  selector: 'app-update-email-component',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './update-email-component.html',
  styleUrl: './update-email-component.css',
})
export class UpdateEmailComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  currentEmail = signal<string>('');
  isLoadingProfile = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  isSuccessStep = signal<boolean>(false);

  errorMessage = signal<string>('');
  serverSuccessMessage = signal<string>('');
  submittedEmail = signal<string>('');

  emailForm: FormGroup = this.fb.group(
    {
      newEmail: ['', [Validators.required, Validators.email]],
      confirmEmail: ['', [Validators.required, Validators.email]],
    },
    { validators: this.emailsMatchValidator }
  );

  ngOnInit() {
    const user = this.authService.currentUser();
    if (!user?.userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.authService.getUserProfile(user.userId).subscribe({
      next: (res) => {
        this.currentEmail.set(res.data?.email || '');
        this.isLoadingProfile.set(false);
      },
      error: () => {
        this.isLoadingProfile.set(false);
      },
    });
  }

  private emailsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newEmail = group.get('newEmail')?.value?.trim().toLowerCase();
    const confirmEmail = group.get('confirmEmail')?.value?.trim().toLowerCase();
    if (newEmail && confirmEmail && newEmail !== confirmEmail) {
      return { emailMismatch: true };
    }
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.emailForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  hasMismatchError(): boolean {
    const confirmControl = this.emailForm.get('confirmEmail');
    return !!(
      this.emailForm.errors?.['emailMismatch'] &&
      confirmControl &&
      (confirmControl.dirty || confirmControl.touched)
    );
  }

  onSubmit() {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const user = this.authService.currentUser();
    if (!user?.userId) return;

    const newEmailValue = this.emailForm.value.newEmail.trim();

    if (this.currentEmail() && newEmailValue.toLowerCase() === this.currentEmail().toLowerCase()) {
      this.errorMessage.set('New email address must be different from your current email.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService.updateUserEmail(user.userId, newEmailValue).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.submittedEmail.set(newEmailValue);
        this.serverSuccessMessage.set(
          res.message || 'Email updated! Please check your new inbox to verify your account.'
        );
        this.isSuccessStep.set(true);
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          err?.error?.error || err?.error?.message || 'Could not update email. Please try again.'
        );
      },
    });
  }

  reLoginWithNewEmail() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
