import {Component, inject, signal} from '@angular/core';
import {AuthService} from '../../../core/services/AuthService';
import {Router, RouterLink} from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // UI State Signals
  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  togglePasswordVisibility() {
    this.showPassword.update(show => !show);
  }

  // Helper to check field validity cleanly in HTML
  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const role = res?.data?.role?.toUpperCase();

        // Role-based routing
        if (role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else if (role === 'RIDER') {
          this.router.navigate(['/rider']);
        } else {
          this.router.navigate(['/customer']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const backendMsg = err?.error?.message || err?.error?.error;
        this.errorMessage.set(backendMsg || 'Invalid email or password. Please try again.');
      }
    });
  }
}
