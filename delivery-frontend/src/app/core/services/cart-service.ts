import {computed, Injectable, signal} from '@angular/core';
import {MenuItem} from '../models/menu-item.model';

export interface CartItem extends MenuItem {
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {

  cartItems = signal<CartItem[]>([]);

  totalItems = computed(() => {
    return this.cartItems().reduce((total, item) => total + item.quantity, 0);
  });

  totalPrice = computed(() => {
    return this.cartItems().reduce((total, item) => total + (item.price * item.quantity), 0);
  });

  addToCart(item: MenuItem) {
    this.cartItems.update(items => {
      const existingItem = items.find(i => i.id === item.id);

      if (existingItem) {
        // If it's already in the cart, just increase the quantity
        return items.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        // Otherwise, add it as a new item with quantity 1
        return [...items, { ...item, quantity: 1 }];
      }
    });
  }

  removeFromCart(itemId: string) {
    this.cartItems.update(items => items.filter(i => i.id !== itemId));
  }

  clearCart() {
    this.cartItems.set([]);
  }
}
