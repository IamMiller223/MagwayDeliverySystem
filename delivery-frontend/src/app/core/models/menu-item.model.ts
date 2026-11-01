export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  image: string;
  category: string;
  price: number;
  isAvailable: boolean;
}
