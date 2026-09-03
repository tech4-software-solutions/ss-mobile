import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Product, Category, Brand, Review, PromoCode, StoreHours, Order, OrderStatus, OrderItem } from "../types";
import {
  products as fallbackProducts,
  categories as fallbackCategories,
  brands as fallbackBrands,
  reviews as fallbackReviews,
} from "../data/store";
import { useAuth } from "./AuthContext";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

interface StoreContextValue {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  reviews: Review[];
  promoCodes: PromoCode[];
  storeHours: StoreHours[];
  orders: Order[];
  loading: boolean;
  refresh: () => Promise<void>;
  fetchAdminPromos: () => Promise<void>;
  fetchAdminOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveBrand: (brand: Brand) => Promise<void>;
  deleteBrand: (id: string) => Promise<void>;
  savePromo: (promo: PromoCode) => Promise<void>;
  deletePromo: (id: string) => Promise<void>;
  saveStoreHours: (hours: StoreHours[]) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const defaultHours: StoreHours[] = [
  { day: "Monday", open: "8:00 AM", close: "9:00 PM", closed: false },
  { day: "Tuesday", open: "8:00 AM", close: "9:00 PM", closed: false },
  { day: "Wednesday", open: "8:00 AM", close: "9:00 PM", closed: false },
  { day: "Thursday", open: "8:00 AM", close: "9:00 PM", closed: false },
  { day: "Friday", open: "8:00 AM", close: "9:00 PM", closed: false },
  { day: "Saturday", open: "8:00 AM", close: "10:00 PM", closed: false },
  { day: "Sunday", open: "9:00 AM", close: "8:00 PM", closed: false },
];

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    brand: row.brand as string,
    category: row.category as string,
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    discount: row.discount ? Number(row.discount) : undefined,
    image: row.image as string,
    description: (row.description as string) || "",
    specs: (row.specs as Record<string, string>) || {},
    colors: (row.colors as string[]) || [],
    trending: Boolean(row.trending),
    views: Number(row.views) || 0,
    inStock: Boolean(row.in_stock),
    isOffer: Boolean(row.is_offer),
    tags: (row.tags as string[]) || [],
  };
}

function mapBrand(row: Record<string, unknown>): Brand {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    textColor: (row.text_color as string) || "#FFFFFF",
    bgImageUrl: (row.bg_image_url as string) || undefined,
    sortOrder: Number(row.sort_order) || 0,
  };
}

function mapOrderItem(row: Record<string, unknown>): OrderItem {
  return {
    id: (row.id as string) || undefined,
    orderId: (row.order_id as string) || undefined,
    productId: (row.product_id as string) || "",
    productName: (row.product_name as string) || "",
    quantity: Number(row.quantity) || 0,
    unitPrice: Number(row.unit_price) || 0,
  };
}

function mapOrder(row: Record<string, unknown>, items: OrderItem[] = []): Order {
  return {
    id: row.id as string,
    customerName: (row.customer_name as string) || "",
    customerPhone: (row.customer_phone as string) || "",
    customerEmail: (row.customer_email as string) || undefined,
    deliveryMethod: (row.delivery_method as "pickup" | "delivery") || "pickup",
    address: (row.address as string) || undefined,
    subtotal: Number(row.subtotal) || 0,
    deliveryFee: Number(row.delivery_fee) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    total: Number(row.total) || 0,
    promoCode: (row.promo_code as string) || undefined,
    status: ((row.status as OrderStatus) || "pending"),
    stripePaymentIntentId: (row.stripe_payment_intent_id as string) || undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    items,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { session, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [brands, setBrands] = useState<Brand[]>(fallbackBrands);
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [storeHours, setStoreHours] = useState<StoreHours[]>(defaultHours);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const fetchAll = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const publicRequests = [
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("brands").select("*").order("sort_order"),
      supabase.from("reviews").select("*").order("sort_order"),
      supabase.from("store_hours").select("*").order("sort_order"),
    ];

    const adminRequests = isAdmin && session
      ? [
          supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
          supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
        ]
      : [Promise.resolve({ data: [] as Record<string, unknown>[] | null, error: null }), Promise.resolve({ data: [] as Record<string, unknown>[] | null, error: null })];

    const [prodRes, catRes, brandRes, reviewRes, hoursRes, promoRes, ordersRes] = await Promise.all([
      ...publicRequests,
      ...adminRequests,
    ]);

    if (prodRes.data?.length) setProducts(prodRes.data.map(mapProduct));
    if (catRes.data?.length) {
      setCategories(catRes.data.map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
      })));
    }
    if (brandRes.data?.length) setBrands(brandRes.data.map(mapBrand));
    if (reviewRes.data?.length) {
      setReviews(reviewRes.data.map((r) => ({
        id: r.id,
        name: r.name,
        rating: r.rating,
        comment: r.comment,
        imageKey: r.image_key,
        product: r.product,
        date: r.review_date,
      })));
    }
    if (promoRes.data?.length) {
      setPromoCodes(promoRes.data.map((p) => ({
        id: p.id,
        code: p.code,
        discount: Number(p.discount),
        type: p.discount_type as "percent" | "fixed",
        active: p.active,
        uses: p.uses,
        maxUses: p.max_uses ?? undefined,
      })));
    } else {
      setPromoCodes([]);
    }
    if (hoursRes.data?.length) {
      setStoreHours(hoursRes.data.map((r) => ({
        id: r.id,
        day: r.day,
        open: r.open_time,
        close: r.close_time,
        closed: r.closed,
        sortOrder: r.sort_order,
      })));
    }
    if (ordersRes.data?.length) {
      setOrders(ordersRes.data.map((row) => mapOrder(row, (row.order_items as Record<string, unknown>[] | null)?.map(mapOrderItem) || [])));
    } else {
      setOrders([]);
    }

    setLoading(false);
  }, [isAdmin, session]);

  const fetchAdminPromos = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !session || !isAdmin) {
      setPromoCodes([]);
      return;
    }
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    if (data?.length) {
      setPromoCodes(data.map((p) => ({
        id: p.id,
        code: p.code,
        discount: Number(p.discount),
        type: p.discount_type as "percent" | "fixed",
        active: p.active,
        uses: p.uses,
        maxUses: p.max_uses ?? undefined,
      })));
      return;
    }
    setPromoCodes([]);
  }, [isAdmin, session]);

  const fetchAdminOrders = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !session || !isAdmin) {
      setOrders([]);
      return;
    }
    const { data } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
    if (data?.length) {
      setOrders(data.map((row) => mapOrder(row, (row.order_items as Record<string, unknown>[] | null)?.map(mapOrderItem) || [])));
      return;
    }
    setOrders([]);
  }, [isAdmin, session]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (!error) {
      setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, status } : order));
      await fetchAdminOrders();
    }
  }, [fetchAdminOrders]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel("store-live-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => { void fetchAll(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brands" },
        () => { void fetchAll(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => { void fetchAll(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => { void fetchAll(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promo_codes" },
        () => { void fetchAll(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_hours" },
        () => { void fetchAll(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        () => { void fetchAll(); },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const saveProduct = async (product: Product) => {
    setProducts((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      return exists ? prev.map((p) => (p.id === product.id ? product : p)) : [...prev, product];
    });

    const supabase = getSupabase();
    if (!supabase) return;

    await supabase.from("products").upsert({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      original_price: product.originalPrice,
      discount: product.discount,
      image: product.image,
      description: product.description,
      specs: product.specs,
      colors: product.colors,
      trending: product.trending,
      views: product.views,
      in_stock: product.inStock,
      is_offer: product.isOffer,
      tags: product.tags,
    });
  };

  const deleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    const supabase = getSupabase();
    if (supabase) await supabase.from("products").delete().eq("id", id);
  };

  const saveCategory = async (category: Category) => {
    setCategories((prev) => {
      const exists = prev.find((c) => c.id === category.id);
      return exists ? prev.map((c) => (c.id === category.id ? category : c)) : [...prev, category];
    });
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from("categories").upsert({
        id: category.id,
        name: category.name,
        icon: category.icon,
      });
    }
  };

  const deleteCategory = async (id: string) => {
    if (id === "all") return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    const supabase = getSupabase();
    if (supabase) await supabase.from("categories").delete().eq("id", id);
  };

  const saveBrand = async (brand: Brand) => {
    const payload = {
      id: brand.id,
      name: brand.name,
      color: brand.color,
      text_color: brand.textColor,
      bg_image_url: brand.bgImageUrl,
      sort_order: brand.sortOrder ?? 0,
    };

    setBrands((prev) => {
      const exists = prev.find((b) => b.id === brand.id);
      return exists ? prev.map((b) => (b.id === brand.id ? brand : b)) : [...prev, brand];
    });

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from("brands").upsert(payload, { onConflict: "id" });
      await fetchAll();
    }
  };

  const deleteBrand = async (id: string) => {
    setBrands((prev) => prev.filter((b) => b.id !== id));
    const supabase = getSupabase();
    if (supabase) await supabase.from("brands").delete().eq("id", id);
  };

  const savePromo = async (promo: PromoCode) => {
    const payload: Record<string, unknown> = {
      code: promo.code,
      discount: promo.discount,
      discount_type: promo.type,
      active: promo.active,
      uses: promo.uses,
      max_uses: promo.maxUses,
    };

    if (promo.id && promo.id.includes("-")) {
      payload.id = promo.id;
    }

    setPromoCodes((prev) => {
      const exists = prev.find((p) => p.id === promo.id);
      return exists ? prev.map((p) => (p.id === promo.id ? promo : p)) : [...prev, promo];
    });

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from("promo_codes").upsert(payload, { onConflict: "code" });
      await fetchAdminPromos();
    }
  };

  const deletePromo = async (id: string) => {
    setPromoCodes((prev) => prev.filter((p) => p.id !== id));
    const supabase = getSupabase();
    if (supabase) await supabase.from("promo_codes").delete().eq("id", id);
  };

  const saveStoreHours = async (hours: StoreHours[]) => {
    setStoreHours(hours);
    const supabase = getSupabase();
    if (!supabase) return;
    for (const h of hours) {
      await supabase.from("store_hours").upsert({
        day: h.day,
        open_time: h.open,
        close_time: h.close,
        closed: h.closed,
        sort_order: h.sortOrder,
      }, { onConflict: "day" });
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        brands,
        reviews,
        promoCodes,
        storeHours,
        orders,
        loading,
        refresh: fetchAll,
        fetchAdminPromos,
        fetchAdminOrders,
        updateOrderStatus,
        saveProduct,
        deleteProduct,
        saveCategory,
        deleteCategory,
        saveBrand,
        deleteBrand,
        savePromo,
        deletePromo,
        saveStoreHours,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
