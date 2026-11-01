import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AuthService, UpdateProfilePayload, UserProfile } from '../../../core/services/AuthService';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Observable, of, switchMap } from 'rxjs';

type EditableField = 'name' | 'phone';

@Component({
  selector: 'app-customer-profile-component',
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './customer-profile-component.html',
  styleUrl: './customer-profile-component.css',
})
export class CustomerProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  profile = signal<UserProfile | null>(null);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // File upload state for Profile Picture
  selectedFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  // Track inline edit state for Name and Phone
  editingFields = signal<Record<EditableField, boolean>>({
    name: false,
    phone: false,
  });

  // Show Save bar if Name is edited, Phone is edited, OR a new photo was picked
  hasActiveEdits = computed(() => {
    const fields = this.editingFields();
    return fields.name || fields.phone || this.selectedFile() !== null;
  });

  readonly defaultAvatar =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239ca3af'><rect width='24' height='24' fill='%23f3f4f6'/><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

  profileForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{7,15}$/)]],
  });

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    const currentUser = this.authService.currentUser();
    if (!currentUser?.userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.getUserProfile(currentUser.userId).subscribe({
      next: (res) => {
        this.profile.set(res.data);
        this.syncFormWithProfile(res.data);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.errorMessage.set(err?.error?.error || err?.error?.message || 'Could not load profile.');
        this.isLoading.set(false);
      },
    });
  }

  private syncFormWithProfile(data: UserProfile) {
    this.profileForm.patchValue({
      name: data.name || '',
      phone: data.phone || '',
    });
  }

  // Triggered when user selects a photo from their phone/PC
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validate image type and size (max 5MB)
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set('Image size must be less than 5MB.');
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.selectedFile.set(file);

    // Create instant local preview for the avatar circle
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreviewUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  cancelPhotoSelection(fileInput?: HTMLInputElement) {
    this.selectedFile.set(null);
    this.imagePreviewUrl.set(null);
    if (fileInput) {
      fileInput.value = '';
    }
  }

  enableFieldEdit(field: EditableField) {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.editingFields.update((curr) => ({ ...curr, [field]: true }));
  }

  enableAllEdits() {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.editingFields.set({ name: true, phone: true });
  }

  cancelFieldEdit(field: EditableField) {
    const currentData = this.profile();
    if (currentData) {
      this.profileForm.get(field)?.setValue(currentData[field] || '');
      this.profileForm.get(field)?.markAsPristine();
    }
    this.editingFields.update((curr) => ({ ...curr, [field]: false }));
  }

  cancelAllEdits(fileInput?: HTMLInputElement) {
    const currentData = this.profile();
    if (currentData) {
      this.syncFormWithProfile(currentData);
    }
    this.editingFields.set({ name: false, phone: false });
    this.cancelPhotoSelection(fileInput);
    this.errorMessage.set('');
  }

  areEditedFieldsValid(): boolean {
    const active = this.editingFields();
    if (active.name && this.profileForm.get('name')?.invalid) return false;
    if (active.phone && this.profileForm.get('phone')?.invalid) return false;
    return true;
  }

  saveChanges(fileInput?: HTMLInputElement) {
    if (!this.areEditedFieldsValid()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const currentData = this.profile();
    if (!currentData) return;

    const active = this.editingFields();
    const formValues = this.profileForm.value;
    const file = this.selectedFile();

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    // Step 1: Explicitly typed Observable<string | null>
    const uploadObservable: Observable<string | null> = file
      ? this.authService.uploadImage(file)
      : of(null);

    uploadObservable.pipe(
      switchMap((uploadedFilename: string | null) => {
        // Step 2: Build payload with the new image filename (or keep existing)
        const payload: UpdateProfilePayload = {
          name: active.name ? formValues.name.trim() : currentData.name,
          phone: active.phone ? formValues.phone.trim() : currentData.phone,
          image: uploadedFilename ? uploadedFilename.trim() : currentData.image,
        };
        return this.authService.updateUserProfile(currentData.userId, payload);
      })
    ).subscribe({
      next: (res) => {
        const updated: UserProfile = {
          ...currentData,
          ...(res.data || {}),
        };
        this.profile.set(updated);
        this.syncFormWithProfile(updated);
        this.editingFields.set({ name: false, phone: false });
        this.cancelPhotoSelection(fileInput);
        this.isSaving.set(false);
        this.successMessage.set(res.message || 'Profile updated successfully!');

        setTimeout(() => this.successMessage.set(''), 3500);
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.errorMessage.set(err?.error?.error || err?.error?.message || 'Failed to update profile.');
      },
    });
  }

  getAvatarUrl(imagePath: string | undefined | null): string {
    if (this.imagePreviewUrl()) {
      return this.imagePreviewUrl()!;
    }
    if (!imagePath || imagePath.trim() === '') return this.defaultAvatar;
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    return `${environment.serverUrl}/images/${imagePath}`;
  }

  onAvatarError(event: Event) {
    (event.target as HTMLImageElement).src = this.defaultAvatar;
  }

  isFieldInvalid(fieldName: EditableField): boolean {
    const control = this.profileForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
