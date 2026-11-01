import {Component, inject} from '@angular/core';
import {CartItem, CartService} from '../../../core/services/cart-service';
import {CurrencyPipe} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import {AuthService} from '../../../core/services/AuthService';
import {environment} from '../../../../environments/environment';


@Component({
  selector: 'app-cart-component',
  imports: [
    CurrencyPipe,
    RouterLink
  ],
  templateUrl: './cart-component.html',
  styleUrl: './cart-component.css',
})
export class CartComponent {
  cartService = inject(CartService);
  private authService = inject(AuthService);
  private router = inject(Router);

  increaseQuantity(item: CartItem) {
    this.cartService.addToCart(item); // Re-adding the same item increases qty by 1
  }

  decreaseQuantity(item: CartItem) {
    if (item.quantity > 1) {
      this.cartService.cartItems.update(items =>
        // Fixed the broken subtraction syntax here
        items.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)
      );
    } else {
      this.cartService.removeFromCart(item.id);
    }
  }

  removeItem(itemId: string) {
    this.cartService.removeFromCart(itemId);
  }

  checkout() {
    if (this.authService.getToken()) {
      // User is authenticated, move to the actual checkout/payment screen
      this.router.navigate(['/customer/checkout']);
    } else {
      // Guest user, force them to log in first
      this.router.navigate(['/login']);
    }
  }

  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) return 'assets/placeholder-food.jpg';
    if (imagePath.startsWith('http')) return imagePath;
    return `${environment.serverUrl}/images/${imagePath}`;
  }
}
