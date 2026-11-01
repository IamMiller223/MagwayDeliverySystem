import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/AuthService';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CartService } from '../../../core/services/cart-service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './customer-layout.html',
  styleUrl: './customer-layout.css',
})
export class CustomerLayout {
  cartService = inject(CartService);
  authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.currentUser;
  isAccountMenuOpen = signal<boolean>(false);

  // Detect normalized role ('ADMIN', 'RIDER', 'CUSTOMER', or null)
  userRole = computed<string | null>(() => {
    const currentUser = this.user() as any;
    if (!currentUser) return null;

    const rawRole =
      currentUser.role ||
      currentUser.userRole ||
      (Array.isArray(currentUser.roles) ? currentUser.roles[0] : null);

    if (!rawRole) return null;
    return String(rawRole).toUpperCase().replace(/^ROLE_/, '');
  });

  isAdmin = computed(() => this.userRole() === 'ADMIN');
  isRider = computed(() => this.userRole() === 'RIDER');

  readonly defaultAvatar =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239ca3af'><rect width='24' height='24' fill='%23f3f4f6'/><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

  getUserAvatarUrl(imgPath: string | undefined | null): string {
    if (!imgPath || imgPath.trim() === '') {
      return this.defaultAvatar;
    }
    if (imgPath.startsWith('http')) {
      return imgPath;
    }
    return `${environment.serverUrl}/images/${imgPath}`;
  }

  onAvatarError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = this.defaultAvatar;
  }

  toggleAccountMenu(event: Event) {
    event.stopPropagation();
    this.isAccountMenuOpen.update(open => !open);
  }

  closeAccountMenu() {
    this.isAccountMenuOpen.set(false);
  }

  logout() {
    this.closeAccountMenu();
    this.authService.logout();
    this.router.navigate(['/customer']);
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.isAccountMenuOpen()) {
      this.closeAccountMenu();
    }
  }
}
