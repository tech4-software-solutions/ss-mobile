export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  description: string;
  specs: Record<string, string>;
  colors?: string[];
  trending?: boolean;
  views?: number;
  inStock: boolean;
  isOffer?: boolean;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Brand {
  id: string;
  name: string;
  color: string;
  textColor?: string;
  bgImageUrl?: string;
  sortOrder?: number;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  imageKey: string;
  product: string;
  date: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  color?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount: number;
  type: "percent" | "fixed";
  active: boolean;
  uses: number;
  maxUses?: number;
}

export interface StoreHours {
  id?: string;
  day: string;
  open: string;
  close: string;
  closed: boolean;
  sortOrder?: number;
}

export type OrderStatus = "pending" | "paid" | "in_progress" | "completed" | "fulfilled" | "cancelled";

export interface OrderItem {
  id?: string;
  orderId?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryMethod: "pickup" | "delivery";
  address?: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  promoCode?: string;
  status: OrderStatus;
  stripePaymentIntentId?: string;
  createdAt: string;
  items?: OrderItem[];
}

export interface CheckoutDetails {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryMethod: "pickup" | "delivery";
  address?: string;
  promoCode?: string;
}

export interface PromoValidation {
  valid: boolean;
  code?: string;
  discount?: number;
  type?: "percent" | "fixed";
  message?: string;
}
