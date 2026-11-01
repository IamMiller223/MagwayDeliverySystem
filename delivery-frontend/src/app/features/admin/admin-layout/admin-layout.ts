import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/AuthService';
import { environment } from '../../../../environments/environment';

interface AdminNavItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
  badge?: number;
  section: 'MAIN' | 'MANAGEMENT' | 'SYSTEM';
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Interactive UI State Signals
  isSidebarCollapsed = signal<boolean>(false);
  isProfileMenuOpen = signal<boolean>(false);
  isWsConnected = signal<boolean>(true); // Hook into your WebSocket service status
  isRefreshing = signal<boolean>(false);
  currentUrl = signal<string>('/admin');
  lastSyncedTime = signal<Date>(new Date());

  // Reactive Current Admin User
  adminUser = computed(() => this.authService.currentUser());

  // Navigation Items matching your Postman API modules
  navItems: AdminNavItem[] = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard', exact: true, section: 'MAIN' },
    { label: 'Live Orders', route: '/admin/orders', icon: 'orders', section: 'MAIN' },
    { label: 'Restaurants & Menus', route: '/admin/restaurants', icon: 'restaurants', section: 'MANAGEMENT' },
    { label: 'Riders Fleet', route: '/admin/riders', icon: 'riders', section: 'MANAGEMENT' },
    { label: 'Customers', route: '/admin/customers', icon: 'customers', section: 'MANAGEMENT' },
    { label: 'Delivery Fee Config', route: '/admin/config', icon: 'config', section: 'SYSTEM' },
  ];

  // Dynamic Header Title & Subtitle based on active route
  activePageMeta = computed(() => {
    const url = this.currentUrl();
    if (url.includes('/admin/orders')) {
      return { title: 'Live Order Operations', subtitle: 'Accept, reject, and dispatch orders to nearest riders' };
    }
    if (url.includes('/admin/restaurants')) {
      return { title: 'Restaurants & Menus', subtitle: 'Manage partner restaurants, coordinates, and menu items' };
    }
    if (url.includes('/admin/riders')) {
      return { title: 'Riders & Fleet Management', subtitle: 'Onboard riders, update vehicles, and monitor status' };
    }
    if (url.includes('/admin/customers')) {
      return { title: 'Registered Customers', subtitle: 'View customer profiles and account details' };
    }
    if (url.includes('/admin/config')) {
      return { title: 'Delivery Pricing Configuration', subtitle: 'Adjust base fee, per-km rate, multi-stop surcharge & rounding' };
    }
    return { title: 'Executive Overview', subtitle: 'Real-time Magway Food Delivery metrics & live operations' };
  });

  ngOnInit() {
    this.currentUrl.set(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.isProfileMenuOpen.set(false);
      });
  }

  toggleSidebar() {
    this.isSidebarCollapsed.update((v) => !v);
  }

  toggleProfileMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isProfileMenuOpen.update((v) => !v);
  }

  @HostListener('document:click')
  closeDropdowns() {
    if (this.isProfileMenuOpen()) {
      this.isProfileMenuOpen.set(false);
    }
  }

  triggerGlobalRefresh() {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);

    // Broadcast a custom event that child pages (Dashboard, Live Orders, etc.) can listen to,
    // or call your shared state/service refresh directly
    window.dispatchEvent(new CustomEvent('admin-manual-refresh'));

    setTimeout(() => {
      this.lastSyncedTime.set(new Date());
      this.isRefreshing.set(false);
    }, 600);
  }

  getAvatarUrl(img?: string | null): string {
    if (!img) return 'https://ui-avatars.com/api/?name=Admin&background=ea580c&color=fff&bold=true';
    if (img.startsWith('http')) return img;

    // Remove '/api' from the end of the environment URL
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}/images/${img}`;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
