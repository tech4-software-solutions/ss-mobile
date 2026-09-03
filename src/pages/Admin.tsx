import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, Smartphone, FolderOpen, Handshake, Tag, Clock, LogOut,
  Plus, Trash2, Pencil, Upload, ImageIcon, Loader2, PackageCheck, DollarSign,
  Users, ShoppingBag,
} from "lucide-react";
import type { Product, Category, Brand, PromoCode, Order, OrderStatus } from "../types";
import { useStore } from "../context/StoreContext";
import { useAuth } from "../context/AuthContext";
import { uploadBrandImage } from "../lib/api";
import { CategoryIcon } from "../lib/icons";

type Tab = "overview" | "orders" | "products" | "categories" | "brands" | "promos" | "hours";

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

const inputClass = "w-full px-3 py-2.5 rounded-xl font-body text-sm bg-wood-50 border border-border outline-none focus:border-forest/40";
const cardClass = "p-4 rounded-xl surface-card";

const statusMeta: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 border border-amber-200" },
  paid: { label: "Paid", className: "bg-cyan-100 text-cyan-800 border border-cyan-200" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-800 border border-blue-200" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  fulfilled: { label: "Fulfilled", className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 border border-red-200" },
};

export default function Admin() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const {
    products, categories, brands, promoCodes, storeHours, orders,
    saveProduct, deleteProduct, saveCategory, deleteCategory,
    saveBrand, deleteBrand, savePromo, deletePromo, saveStoreHours,
    fetchAdminPromos, fetchAdminOrders, updateOrderStatus,
  } = useStore();

  useEffect(() => {
    fetchAdminPromos();
    fetchAdminOrders();
  }, [fetchAdminPromos, fetchAdminOrders]);

  const [tab, setTab] = useState<Tab>("overview");
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Partial<PromoCode> | null>(null);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [hours, setHours] = useState(storeHours);
  const [uploadingBrand, setUploadingBrand] = useState<string | null>(null);

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: "overview", icon: BarChart3, label: "Overview" },
    { id: "orders", icon: ShoppingBag, label: "Orders" },
    { id: "products", icon: Smartphone, label: "Products" },
    { id: "categories", icon: FolderOpen, label: "Categories" },
    { id: "brands", icon: Handshake, label: "Brands" },
    { id: "promos", icon: Tag, label: "Promos" },
    { id: "hours", icon: Clock, label: "Hours" },
  ];

  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d" | "90d" | "12m">("all");

  const dateWindowMap: Record<Exclude<typeof dateFilter, "all">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "12m": 365,
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const orderDate = new Date(order.createdAt).getTime();
    const cutoff = dateFilter === "all" ? null : Date.now() - dateWindowMap[dateFilter] * 24 * 60 * 60 * 1000;
    const matchesDate = dateFilter === "all" || orderDate >= cutoff!;
    return matchesStatus && matchesDate;
  });

  const totalRevenue = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const filteredRevenue = filteredOrders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const inStockCount = products.filter((p) => p.inStock).length;
  const lowStockProducts = products.filter((p) => !p.inStock || Number(p.views || 0) < 5).slice(0, 5);
  const totalUnits = products.reduce((sum, p) => sum + (p.views || 0), 0);

  const customerMap = new Map<string, number>();
  orders.forEach((order) => {
    const key = (order.customerEmail || order.customerPhone || order.customerName).trim();
    if (!key) return;
    customerMap.set(key, (customerMap.get(key) || 0) + Number(order.total || 0));
  });
  const topCustomers = [...customerMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const categoryRevenue = categories
    .filter((cat) => cat.id !== "all")
    .map((category) => {
      const categoryTotal = orders.reduce((sum, order) => {
        const itemTotal = (order.items || []).reduce((acc, item) => {
          const product = products.find((p) => p.id === item.productId);
          if (product && product.category === category.id) {
            return acc + Number(item.unitPrice || product.price) * Number(item.quantity || 0);
          }
          return acc;
        }, 0);
        return sum + itemTotal;
      }, 0);
      return { name: category.name, total: categoryTotal };
    })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const revenueByStatus = (Object.keys(statusMeta) as OrderStatus[])
    .map((status) => ({
      status,
      total: filteredOrders
        .filter((order) => order.status === status)
        .reduce((sum, order) => sum + Number(order.total || 0), 0),
      count: filteredOrders.filter((order) => order.status === status).length,
    }))
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total);

  const pieSegments = revenueByStatus.length
    ? revenueByStatus.reduce<{ label: string; value: number; color: string; start: number; end: number }[]>((acc, item, index) => {
        const total = revenueByStatus.reduce((sum, entry) => sum + entry.total, 0) || 1;
        const prev = acc.reduce((sum, entry) => sum + entry.value, 0);
        const colors = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#a78bfa", "#f97316"];
        const start = (prev / total) * 100;
        const end = ((prev + item.total) / total) * 100;
        acc.push({
          label: item.status,
          value: item.total,
          color: colors[index % colors.length],
          start,
          end,
        });
        return acc;
      }, [])
    : [];

  const pieStyle = pieSegments.length
    ? { background: `conic-gradient(${pieSegments.map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`).join(", ")})` }
    : { background: "conic-gradient(#e5e7eb 0 100%)" };

  const chartValues = [
    { label: "Mon", value: filteredOrders.filter((o) => new Date(o.createdAt).getDay() === 1).reduce((s, o) => s + (o.total || 0), 0) },
    { label: "Tue", value: filteredOrders.filter((o) => new Date(o.createdAt).getDay() === 2).reduce((s, o) => s + (o.total || 0), 0) },
    { label: "Wed", value: filteredOrders.filter((o) => new Date(o.createdAt).getDay() === 3).reduce((s, o) => s + (o.total || 0), 0) },
    { label: "Thu", value: filteredOrders.filter((o) => new Date(o.createdAt).getDay() === 4).reduce((s, o) => s + (o.total || 0), 0) },
    { label: "Fri", value: filteredOrders.filter((o) => new Date(o.createdAt).getDay() === 5).reduce((s, o) => s + (o.total || 0), 0) },
    { label: "Sat", value: filteredOrders.filter((o) => new Date(o.createdAt).getDay() === 6).reduce((s, o) => s + (o.total || 0), 0) },
    { label: "Sun", value: filteredOrders.filter((o) => new Date(o.createdAt).getDay() === 0).reduce((s, o) => s + (o.total || 0), 0) },
  ];
  const maxChartValue = Math.max(...chartValues.map((entry) => entry.value), 1);

  const handleSaveProduct = async () => {
    if (!editingProduct?.name || !editingProduct?.price) return;
    const product: Product = {
      id: editingProduct.id || `p${Date.now()}`,
      name: editingProduct.name,
      brand: editingProduct.brand || "Generic",
      category: editingProduct.category || "smartphones",
      price: Number(editingProduct.price),
      originalPrice: editingProduct.originalPrice ? Number(editingProduct.originalPrice) : undefined,
      discount: editingProduct.discount ? Number(editingProduct.discount) : undefined,
      image: editingProduct.image || "",
      description: editingProduct.description || "",
      specs: editingProduct.specs || {},
      inStock: editingProduct.inStock ?? true,
      views: editingProduct.views || 0,
    };
    await saveProduct(product);
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleBrandImageUpload = async (brandId: string, file: File) => {
    setUploadingBrand(brandId);
    const url = await uploadBrandImage(file);
    if (url) {
      const brand = brands.find((b) => b.id === brandId);
      if (brand) await saveBrand({ ...brand, bgImageUrl: url });
    }
    setUploadingBrand(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const topProducts = [...products].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  return (
    <div className="min-h-screen gradient-wood">
      <div className="py-6 px-4 sm:px-6 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-charcoal text-2xl">Admin Dashboard</h1>
            <p className="font-body text-sm text-muted">SS Mobile Weligama — Store Management</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl text-xs font-body font-semibold bg-forest/10 text-forest border border-forest/20">
              Live
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body text-muted hover:text-charcoal bg-wood-100 border border-border"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-medium flex-shrink-0 transition-all ${
                tab === t.id
                  ? "bg-forest/10 text-forest border border-forest/30"
                  : "bg-white text-muted border border-border"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: DollarSign, val: fmt(totalRevenue), lbl: "Revenue", color: "text-forest" },
                { icon: ShoppingBag, val: String(totalOrders), lbl: "Orders", color: "text-amber-warm" },
                { icon: PackageCheck, val: fmt(avgOrderValue), lbl: "Avg Order", color: "text-forest" },
                { icon: Users, val: String(inStockCount), lbl: "In Stock", color: "text-amber-warm" },
              ].map(({ icon: Icon, val, lbl, color }) => (
                <div key={lbl} className={cardClass}>
                  <Icon className={`w-5 h-5 ${color} mb-2`} />
                  <p className="font-display font-black text-xl text-charcoal">{val}</p>
                  <p className="font-body text-xs text-muted">{lbl}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-6">
              <div className={`${cardClass} overflow-hidden`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Revenue analytics</p>
                    <h3 className="font-display font-bold text-charcoal">Sales trend</h3>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as "all" | OrderStatus)}
                      className="px-3 py-2 rounded-xl text-xs font-body bg-wood-50 border border-border outline-none"
                    >
                      <option value="all">All statuses</option>
                      {Object.entries(statusMeta).map(([status, meta]) => (
                        <option key={status} value={status}>{meta.label}</option>
                      ))}
                    </select>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as "all" | "7d" | "30d" | "90d" | "12m")}
                      className="px-3 py-2 rounded-xl text-xs font-body bg-wood-50 border border-border outline-none"
                    >
                      <option value="all">All time</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                      <option value="12m">Last 12 months</option>
                    </select>
                  </div>
                </div>

                <div className="mb-5 flex items-end justify-between gap-3 rounded-2xl bg-forest/5 border border-forest/10 p-3">
                  <div>
                    <p className="font-body text-[11px] uppercase tracking-[0.18em] text-muted">Filtered revenue</p>
                    <p className="font-display font-black text-2xl text-charcoal">{fmt(filteredRevenue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-body text-[11px] uppercase tracking-[0.18em] text-muted">Orders</p>
                    <p className="font-display font-bold text-charcoal">{filteredOrders.length}</p>
                  </div>
                </div>

                <div className="flex items-end gap-2 h-40 pt-1">
                  {chartValues.map((entry) => (
                    <div key={entry.label} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex items-end justify-center h-28">
                        <div
                          className="w-full rounded-t-2xl bg-gradient-to-t from-forest via-forest to-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                          style={{ height: `${Math.max(10, (entry.value / maxChartValue) * 100)}%` }}
                        />
                      </div>
                      <span className="font-body text-[10px] text-muted uppercase tracking-wide">{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="font-display font-bold text-charcoal mb-4">Revenue by status</h3>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex items-center justify-center h-32 w-32 rounded-full shadow-inner" style={pieStyle}>
                    <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center text-center">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.18em] text-muted">Total</p>
                        <p className="font-display font-black text-lg text-charcoal">{fmt(filteredRevenue)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full space-y-3">
                    {revenueByStatus.length ? revenueByStatus.map((entry) => (
                      <div key={entry.status}>
                        <div className="flex items-center justify-between text-xs font-body text-muted mb-1">
                          <span className="flex items-center gap-2">
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusMeta[entry.status].className.includes("amber") ? "bg-amber-500" : statusMeta[entry.status].className.includes("blue") ? "bg-blue-500" : statusMeta[entry.status].className.includes("red") ? "bg-red-500" : "bg-emerald-500"}`} />
                            {statusMeta[entry.status].label}
                          </span>
                          <span className="text-charcoal font-semibold">{fmt(entry.total)}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-wood-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-warm via-forest to-emerald-500"
                            style={{ width: `${Math.max(8, (entry.total / Math.max(...revenueByStatus.map((item) => item.total), 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )) : <p className="font-body text-sm text-muted">No revenue in the selected filter.</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className={cardClass}>
                <h3 className="font-display font-bold text-charcoal mb-4">Top Products</h3>
                <div className="space-y-3">
                  {topProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                      <span className="font-body text-sm text-charcoal truncate">{p.name}</span>
                      <span className="font-body text-sm text-forest font-semibold">{p.views || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="font-display font-bold text-charcoal mb-4">Top Customers</h3>
                <div className="space-y-3">
                  {topCustomers.length ? topCustomers.map(([name, total], idx) => (
                    <div key={`${name}-${idx}`} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                      <span className="font-body text-sm text-charcoal truncate">{name}</span>
                      <span className="font-body text-sm text-forest font-semibold">{fmt(total)}</span>
                    </div>
                  )) : <p className="font-body text-sm text-muted">No customer data yet.</p>}
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="font-display font-bold text-charcoal mb-4">Order status mix</h3>
                <div className="space-y-3">
                  {revenueByStatus.length ? revenueByStatus.map((entry) => (
                    <div key={`${entry.status}-mix`} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                      <span className="font-body text-sm text-charcoal">{statusMeta[entry.status].label}</span>
                      <span className="font-body text-sm text-muted">{entry.count} orders</span>
                    </div>
                  )) : <p className="font-body text-sm text-muted">No status data in the selected range.</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className={cardClass}>
                <h3 className="font-display font-bold text-charcoal mb-4">Category Revenue</h3>
                <div className="space-y-3">
                  {categoryRevenue.length ? categoryRevenue.map((entry) => (
                    <div key={entry.name}>
                      <div className="flex justify-between text-xs font-body text-muted mb-1">
                        <span>{entry.name}</span>
                        <span>{fmt(entry.total)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-wood-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-warm to-forest"
                          style={{ width: `${Math.max(10, (entry.total / Math.max(...categoryRevenue.map((item) => item.total), 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )) : <p className="font-body text-sm text-muted">No category sales data.</p>}
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="font-display font-bold text-charcoal mb-4">Stock & Inventory</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-body text-muted"><span>Products</span><span>{products.length}</span></div>
                  <div className="flex justify-between text-sm font-body text-muted"><span>In stock</span><span>{inStockCount}</span></div>
                  <div className="flex justify-between text-sm font-body text-muted"><span>Out of stock</span><span>{products.length - inStockCount}</span></div>
                  <div className="flex justify-between text-sm font-body text-muted"><span>View count</span><span>{totalUnits}</span></div>
                  <div className="flex justify-between text-sm font-body text-muted"><span>Low-stock / review</span><span>{lowStockProducts.length}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-charcoal text-lg">Orders ({orders.length})</h2>
            </div>

            {orders.length === 0 ? (
              <div className={cardClass}>
                <p className="font-body text-sm text-muted">No orders yet. Orders will appear here after payment is completed.</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className={`${cardClass} space-y-4`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-display font-bold text-charcoal text-lg">#{order.id.slice(0, 8)}</p>
                      <p className="font-body text-sm text-muted">{order.customerName} · {order.customerPhone}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusMeta[order.status]?.className || statusMeta.pending.className}`}>
                        {statusMeta[order.status]?.label || "Pending"}
                      </span>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                        className="px-3 py-2 rounded-xl text-xs font-body bg-wood-50 border border-border outline-none"
                      >
                        {Object.entries(statusMeta).map(([status, meta]) => (
                          <option key={status} value={status}>{meta.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-body text-muted">
                    <div><span className="font-semibold text-charcoal">Total:</span> {fmt(order.total)}</div>
                    <div><span className="font-semibold text-charcoal">Method:</span> {order.deliveryMethod}</div>
                    <div><span className="font-semibold text-charcoal">Date:</span> {new Date(order.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="space-y-2">
                    {(order.items || []).map((item) => (
                      <div key={`${order.id}-${item.productId}-${item.quantity}`} className="flex justify-between text-sm font-body border-b border-border pb-2 last:border-0 last:pb-0">
                        <span>{item.productName} × {item.quantity}</span>
                        <span>{fmt(Number(item.unitPrice) * Number(item.quantity))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "products" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-charcoal text-lg">Products ({products.length})</h2>
              <button onClick={() => { setEditingProduct({}); setShowProductForm(true); }} className="gradient-brand text-white font-display font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            {showProductForm && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto surface-elevated">
                  <h3 className="font-display font-bold text-charcoal text-lg mb-4">
                    {editingProduct?.id ? "Edit Product" : "Add Product"}
                  </h3>
                  <div className="space-y-3">
                    {[
                      { key: "name", label: "Name" },
                      { key: "brand", label: "Brand" },
                      { key: "price", label: "Price (Rs.)", type: "number" },
                      { key: "originalPrice", label: "Original Price", type: "number" },
                      { key: "discount", label: "Discount %", type: "number" },
                      { key: "image", label: "Image URL" },
                      { key: "description", label: "Description" },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="block font-body text-xs text-muted mb-1">{field.label}</label>
                        <input
                          type={field.type || "text"}
                          value={(editingProduct as Record<string, string | number>)?.[field.key] || ""}
                          onChange={(e) => setEditingProduct((prev) => ({
                            ...prev,
                            [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value,
                          }))}
                          className={inputClass}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block font-body text-xs text-muted mb-1">Category</label>
                      <select
                        value={editingProduct?.category || "smartphones"}
                        onChange={(e) => setEditingProduct((prev) => ({ ...prev, category: e.target.value }))}
                        className={inputClass}
                      >
                        {categories.filter((c) => c.id !== "all").map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={handleSaveProduct} className="flex-1 gradient-brand text-white font-display font-bold py-3 rounded-xl">Save</button>
                    <button onClick={() => { setShowProductForm(false); setEditingProduct(null); }} className="flex-1 py-3 rounded-xl font-body bg-wood-100 text-muted">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {products.map((product) => (
                <div key={product.id} className={`${cardClass} flex items-center gap-4`}>
                  <img src={product.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-wood-100" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-charcoal text-sm truncate">{product.name}</p>
                    <p className="font-body text-xs text-muted">{product.brand} · {fmt(product.price)}</p>
                  </div>
                  <button onClick={() => { setEditingProduct(product); setShowProductForm(true); }} className="p-2 rounded-lg bg-forest/10 text-forest">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteProduct(product.id)} className="p-2 rounded-lg bg-red-50 text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "categories" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-charcoal text-lg">Categories</h2>
              <button onClick={() => { setEditingCategory({}); setShowCategoryForm(true); }} className="gradient-brand text-white font-display font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {showCategoryForm && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-2xl p-6 surface-elevated">
                  <h3 className="font-display font-bold text-charcoal mb-4">Add Category</h3>
                  {["name", "icon", "id"].map((key) => (
                    <div key={key} className="mb-3">
                      <label className="block font-body text-xs text-muted mb-1 capitalize">{key}</label>
                      <input
                        value={(editingCategory as Record<string, string>)?.[key] || ""}
                        onChange={(e) => setEditingCategory((prev) => ({ ...prev, [key]: e.target.value }))}
                        className={inputClass}
                        placeholder={key === "icon" ? "smartphone, headphones, etc." : ""}
                      />
                    </div>
                  ))}
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={async () => {
                        if (editingCategory?.name && editingCategory?.id) {
                          await saveCategory(editingCategory as Category);
                          setShowCategoryForm(false);
                          setEditingCategory(null);
                        }
                      }}
                      className="flex-1 gradient-brand text-white font-display font-bold py-3 rounded-xl"
                    >
                      Save
                    </button>
                    <button onClick={() => { setShowCategoryForm(false); setEditingCategory(null); }} className="flex-1 py-3 rounded-xl bg-wood-100 text-muted">Cancel</button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <div key={cat.id} className={cardClass}>
                  <CategoryIcon icon={cat.icon} className="w-6 h-6 text-forest mb-2" />
                  <p className="font-display font-bold text-charcoal text-sm">{cat.name}</p>
                  {cat.id !== "all" && (
                    <button onClick={() => deleteCategory(cat.id)} className="mt-2 text-xs text-red-500 flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "brands" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-charcoal text-lg">Brands & Partners</h2>
              <button
                onClick={async () => {
                  const brand: Brand = { id: `b${Date.now()}`, name: "New Brand", color: "#1A1A1A", textColor: "#fff" };
                  await saveBrand(brand);
                }}
                className="gradient-brand text-white font-display font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Brand
              </button>
            </div>
            <p className="font-body text-sm text-muted mb-4">
              Upload a background image for each partner card. Images appear on the storefront partners section.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((brand) => (
                <div key={brand.id} className={cardClass}>
                  <div
                    className="w-full h-24 rounded-xl flex items-center justify-center font-display font-black text-lg mb-3 overflow-hidden relative"
                    style={{
                      background: brand.bgImageUrl
                        ? `url(${brand.bgImageUrl}) center/cover`
                        : brand.color,
                      color: brand.textColor || "#fff",
                    }}
                  >
                    {brand.bgImageUrl && <div className="absolute inset-0 bg-charcoal/50" />}
                    <span className="relative z-10">{brand.name}</span>
                  </div>
                  <input
                    value={brand.name}
                    onChange={(e) => saveBrand({ ...brand, name: e.target.value })}
                    className={`${inputClass} mb-2`}
                  />
                  <label className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-body font-semibold bg-wood-100 border border-border cursor-pointer hover:bg-wood-200 transition-all">
                    {uploadingBrand === brand.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-forest" />
                    ) : brand.bgImageUrl ? (
                      <ImageIcon className="w-4 h-4 text-forest" />
                    ) : (
                      <Upload className="w-4 h-4 text-forest" />
                    )}
                    {brand.bgImageUrl ? "Change Background" : "Upload Background"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleBrandImageUpload(brand.id, file);
                      }}
                    />
                  </label>
                  {brand.bgImageUrl && (
                    <button
                      onClick={() => saveBrand({ ...brand, bgImageUrl: undefined })}
                      className="w-full mt-2 text-xs text-muted hover:text-red-500"
                    >
                      Remove background image
                    </button>
                  )}
                  <button onClick={() => deleteBrand(brand.id)} className="w-full mt-2 py-1.5 text-xs text-red-500 flex items-center justify-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete Brand
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "promos" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-charcoal text-lg">Promo Codes</h2>
              <button onClick={() => { setEditingPromo({ type: "percent", active: true, uses: 0 }); setShowPromoForm(true); }} className="gradient-brand text-white font-display font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Code
              </button>
            </div>
            {showPromoForm && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-2xl p-6 surface-elevated">
                  <h3 className="font-display font-bold text-charcoal mb-4">Add Promo Code</h3>
                  <div className="space-y-3">
                    <input value={editingPromo?.code || ""} onChange={(e) => setEditingPromo((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="CODE" className={inputClass} />
                    <input type="number" value={editingPromo?.discount || ""} onChange={(e) => setEditingPromo((p) => ({ ...p, discount: Number(e.target.value) }))} placeholder="Discount value" className={inputClass} />
                    <select value={editingPromo?.type || "percent"} onChange={(e) => setEditingPromo((p) => ({ ...p, type: e.target.value as "percent" | "fixed" }))} className={inputClass}>
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed (Rs.)</option>
                    </select>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={async () => {
                        if (editingPromo?.code && editingPromo?.discount) {
                          await savePromo({ ...editingPromo, id: `pc${Date.now()}`, active: true, uses: 0, type: editingPromo.type || "percent" } as PromoCode);
                          setShowPromoForm(false);
                          setEditingPromo(null);
                        }
                      }}
                      className="flex-1 gradient-brand text-white font-display font-bold py-3 rounded-xl"
                    >
                      Save
                    </button>
                    <button onClick={() => { setShowPromoForm(false); setEditingPromo(null); }} className="flex-1 py-3 rounded-xl bg-wood-100 text-muted">Cancel</button>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {promoCodes.map((promo) => (
                <div key={promo.id} className={`${cardClass} flex items-center justify-between`}>
                  <div>
                    <span className="font-body font-bold text-amber-warm">{promo.code}</span>
                    <p className="font-body text-xs text-muted">
                      {promo.type === "percent" ? `${promo.discount}%` : `Rs.${promo.discount}`} · {promo.uses} uses
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => savePromo({ ...promo, active: !promo.active })}
                      className="px-3 py-1.5 rounded-lg text-xs bg-forest/10 text-forest"
                    >
                      {promo.active ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => deletePromo(promo.id)} className="p-2 rounded-lg bg-red-50 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "hours" && (
          <div>
            <h2 className="font-display font-bold text-charcoal text-lg mb-4">Business Hours</h2>
            <div className="space-y-2">
              {hours.map((h, i) => (
                <div key={h.day} className={`${cardClass} flex items-center gap-4 flex-wrap`}>
                  <p className="font-display font-semibold text-charcoal text-sm w-28">{h.day}</p>
                  <input value={h.open} disabled={h.closed} onChange={(e) => setHours((prev) => prev.map((d, j) => j === i ? { ...d, open: e.target.value } : d))} className="w-28 px-3 py-2 rounded-lg text-xs bg-wood-50 border border-border" />
                  <span className="text-xs text-muted">to</span>
                  <input value={h.close} disabled={h.closed} onChange={(e) => setHours((prev) => prev.map((d, j) => j === i ? { ...d, close: e.target.value } : d))} className="w-28 px-3 py-2 rounded-lg text-xs bg-wood-50 border border-border" />
                  <button
                    onClick={() => setHours((prev) => prev.map((d, j) => j === i ? { ...d, closed: !d.closed } : d))}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold ${h.closed ? "bg-red-50 text-red-500" : "bg-forest/10 text-forest"}`}
                  >
                    {h.closed ? "Closed" : "Open"}
                  </button>
                </div>
              ))}
              <button onClick={() => saveStoreHours(hours)} className="w-full mt-2 gradient-brand text-white font-display font-bold py-3 rounded-xl">
                Save Hours
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
