import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { CustomerLayout } from './features/customer/customer-layout/customer-layout';
import { AdminLayout } from './features/admin/admin-layout/admin-layout';
import { RiderLayout } from './features/rider/rider-layout/rider-layout';
import { RestaurantList } from './features/customer/restaurant-list/restaurant-list';
import { authGuard } from './core/guards/auth-guard';
import { RestaurantMenu } from './features/customer/restaurant-menu/restaurant-menu';
import { CartComponent } from './features/customer/cart-component/cart-component';
import { CheckoutComponent } from './features/customer/checkout-component/checkout-component';
import { CheckoutPaymentComponent } from './features/customer/checkout-payment-component/checkout-payment-component';
import { OrdersComponent } from './features/customer/orders-component/orders-component';
import { OrderDetailsComponent } from './features/customer/order-details-component/order-details-component';
import { SignUpComponent } from './features/customer/sign-up-component/sign-up-component';
import { CustomerProfileComponent } from './features/customer/customer-profile-component/customer-profile-component';
import { UpdateEmailComponent } from './features/customer/update-email-component/update-email-component';
import {UpdatePasswordComponent} from './features/customer/update-password-component/update-password-component';
import {adminGuard} from './core/guards/admin-guard';
import {Dashboard} from './features/admin/dashboard/dashboard';
import {OrderDispatch} from './features/admin/order-dispatch/order-dispatch';
import {LiveOrders} from './features/admin/live-orders/live-orders';
import {RestaurantsManagement} from './features/admin/restaurants-management/restaurants-management';
import {RidersFleet} from './features/admin/riders-fleet/riders-fleet';
import {CustomersManagement} from './features/admin/customers-management/customers-management';
import {DeliveryFeeConfig} from './features/admin/delivery-fee-config/delivery-fee-config';
import {RiderDashboard} from './features/rider/rider-dashboard/rider-dashboard';
import {noRiderInCustomerGuard} from './core/guards/rider-guard';

export const routes: Routes = [
  // Default route points to customer for guest browsing
  { path: '', redirectTo: 'customer', pathMatch: 'full' },

  // Public Auth Routes
  { path: 'login', component: Login },
  { path: 'sign-up', component: SignUpComponent },

  // Customer Layout WITH Children
  {
    path: 'customer',
    component: CustomerLayout,
    canActivate: [noRiderInCustomerGuard],
    children: [
      // Public Guest-Accessible Routes
      { path: '', component: RestaurantList },
      { path: 'restaurant/:id', component: RestaurantMenu },
      { path: 'cart', component: CartComponent },

      // Protected Profile Routes
      { path: 'profile', component: CustomerProfileComponent, canActivate: [authGuard] },
      { path: 'profile/update-email', component: UpdateEmailComponent, canActivate: [authGuard] },
      { path: 'profile/update-password', component: UpdatePasswordComponent, canActivate: [authGuard] },

      // Protected Checkout & Order Routes
      { path: 'checkout', component: CheckoutComponent, canActivate: [authGuard] },
      { path: 'checkout/payment', component: CheckoutPaymentComponent, canActivate: [authGuard] },
      { path: 'orders', component: OrdersComponent, canActivate: [authGuard] },
      { path: 'orders/:id', component: OrderDetailsComponent, canActivate: [authGuard] },
    ]
  },

  // Protected Role Layouts
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'orders', component: LiveOrders },
      { path: 'orders/:orderId/assign', component: OrderDispatch },
      { path: 'restaurants', component: RestaurantsManagement },
      { path: 'riders', component: RidersFleet },
      { path: 'customers', component: CustomersManagement },
      { path: 'config', component: DeliveryFeeConfig },
    ]
  },
  { path: 'rider', component: RiderDashboard, canActivate: [authGuard] },

  // Catch-all route to redirect unknown URLs
  { path: '**', redirectTo: 'customer' }
];
