export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user';
}

export interface Collection {
  id: number;
  title: string;
  products_count: number;
}

export interface ProductImage {
  id: number;
  image: string;
}

export interface Product {
  id: number;
  title: string;
  slug: string;
  description: string;
  unit_price: number;
  price_with_tax: number;
  inventory: number;
  collection: {
    id: number;
    title: string;
  } | number | null;
  images: ProductImage[];
  total_likes: number;
  is_liked: boolean;
  average_rating: number;
  reviews_count: number;
  is_on_sale: boolean;
  discount_type?: 'percent' | 'fixed' | null;
  discount_value?: number | null;
  discount_active?: boolean;
  discounted_price?: number | null;
  discount_label?: string | null;
}

export interface Review {
  id: number;
  data: string;
  name: string;
  description: string;
  rating: number;
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
  total_price: number;
}

export interface Cart {
  id: string; // UUID
  items: CartItem[];
  total_price: number;
}

export interface Customer {
  id: number;
  user_id: number;
  phone: string | null;
  birth_date: string | null;
  membership: 'B' | 'S' | 'G';
}

export interface OrderItem {
  id: number;
  product: {
    id: number;
    title: string;
    unit_price?: number;
  };
  quantity: number;
  total_price: number;
}

export interface Order {
  id: number;
  customer: number;
  placed_at: string;
  payment_status: 'P' | 'C' | 'F';
  items: OrderItem[];
  total_price: number;
}

export interface AuthResponse {
  access: string;
  refresh: string;
}

// ─── Admin / extended types ───────────────────────────────────────────────────

export interface AdminStats {
  total_sales: number;
  total_orders: number;
  total_products: number;
  total_customers: number;
}

export interface AnalyticsData {
  chart_data: {
    dates: string[];
    sales: number[];
  };
  pie_data: {
    labels: string[];
    values: number[];
  };
  summary: {
    total_orders: number;
    total_revenue: number;
  };
}

export interface PromoBanner {
  id: number;
  title: string;
  subtitle: string;
  images: { id: number; image: string }[];
  image_url?: string;
  link: string;
  link_type: 'product' | 'category' | 'external' | '';
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  animation: 'none' | 'fade' | 'slide' | 'scale' | 'bounce' | '';
  zone: 'hero' | 'promotions-grid' | 'category-banner' | 'checkout-banner' | '';
  clicks: number;
  impressions: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  display_name: string;
  description: string;
  enabled: boolean;
  coming_soon: boolean;
  eta: string;
  icon: string;
}

export interface MembershipPlan {
  id: number;
  level: 'bronze' | 'silver' | 'gold';
  name: string;
  discount_percent: number;
  perks_description: string;
  price: number | null;
  is_active: boolean;
}
