import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/AuthService';

@Component({
  selector: 'app-sign-up-component',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-up-component.html',
  styleUrl: './sign-up-component.css',
})
export class SignUpComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // UI State Signals
  isSubmitting = signal<boolean>(false);
  isSuccessStep = signal<boolean>(false);
  errorMessage = signal<string>('');
  serverSuccessMessage = signal<string>('');
  registeredEmail = signal<string>('');

  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  signUpForm: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  toggleVisibility(field: 'password' | 'confirm') {
    if (field === 'password') this.showPassword.update((v) => !v);
    if (field === 'confirm') this.showConfirmPassword.update((v) => !v);
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.signUpForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  hasMismatchError(): boolean {
    const confirmControl = this.signUpForm.get('confirmPassword');
    return !!(
      this.signUpForm.errors?.['passwordMismatch'] &&
      confirmControl &&
      (confirmControl.dirty || confirmControl.touched)
    );
  }

  onSubmit() {
    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.signUpForm.value;
    const trimmedEmail = email.trim();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService.signUp({ name: name.trim(), email: trimmedEmail, password }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.registeredEmail.set(trimmedEmail);
        this.serverSuccessMessage.set(
          res.message || 'Registration successful! Please check your email to verify your account.'
        );
        this.isSuccessStep.set(true);
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          err?.error?.error ||
          err?.error?.message ||
          'Registration failed. Email might already be in use.'
        );
      },
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
