import { useState, useRef } from "react";
import {
  Flame, FolderOpen, Tag, Store, Star, Handshake, MapPin, Phone, Clock, MessageCircle,
  Smartphone, TrendingUp, Wrench, Truck, ChevronDown, ShoppingCart, Check,
} from "lucide-react";
import type { Product } from "../types";
import { useStore } from "../context/StoreContext";
import { CategoryIcon } from "../lib/icons";
import HeroCarousel from "../components/HeroCarousel";
import feedback1 from "../imports/feedback_1.jpg";
import feedback2 from "../imports/feedback2.jpg";
import feedback3 from "../imports/feedback3.jpg";
import feedback4 from "../imports/feedback4.jpg";
import feedback5 from "../imports/feedback_5.jpg";
import feedback6 from "../imports/feedback6.jpg";
import aboutImg from "../imports/about_me.jpg";

const feedbackImages: Record<string, string> = {
  feedback_1: feedback1,
  feedback2,
  feedback3,
  feedback4,
  feedback_5: feedback5,
  feedback6,
};

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

interface HomeProps {
  onAddToCart: (p: Product) => void;
  onBrowse: () => void;
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer surface-card ${
        hovered ? "shadow-xl shadow-forest/10 -translate-y-1 border-forest/20" : ""
      }`}
      style={{ width: "200px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {product.discount && (
        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-bold text-white gradient-brand">
          {product.discount}% OFF
        </span>
      )}
      <div className="relative overflow-hidden h-40 bg-wood-100">
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-500 ${hovered ? "scale-105" : ""}`}
        />
      </div>
      <div className="p-3">
        <p className="font-body text-xs text-forest font-semibold mb-0.5">{product.brand}</p>
        <p className="font-display font-semibold text-charcoal text-sm leading-tight mb-1 truncate">{product.name}</p>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="font-display font-bold text-sm text-amber-warm">{fmt(product.price)}</span>
          {product.originalPrice && (
            <span className="font-body text-xs line-through text-muted">{fmt(product.originalPrice)}</span>
          )}
        </div>
        <button
          onClick={() => onAdd(product)}
          className={`w-full py-2 rounded-xl text-xs font-display font-bold transition-all flex items-center justify-center gap-1.5 ${
            hovered ? "gradient-brand text-white" : "bg-forest/10 text-forest border border-forest/20"
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Add to Cart
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, label, title, accent }: { icon: React.ElementType; label: string; title: string; accent?: string }) {
  return (
    <div className="mb-6">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body font-semibold mb-2 bg-forest/10 text-forest border border-forest/20">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      <h2 className="font-display font-black text-charcoal" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>
        {title} {accent && <span className="text-gradient">{accent}</span>}
      </h2>
    </div>
  );
}

function HorizScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar">
      {children}
    </div>
  );
}

function TrendingSection({ products, onAdd, onBrowse }: { products: Product[]; onAdd: (p: Product) => void; onBrowse: () => void }) {
  const trending = products.filter((p) => p.trending).sort((a, b) => (b.views || 0) - (a.views || 0));
  return (
    <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <SectionTitle icon={Flame} label="Popular" title="Trending" accent="Products" />
        <button onClick={onBrowse} className="text-sm font-body font-medium text-forest hover:underline hidden sm:block">
          View All →
        </button>
      </div>
      <HorizScroll>
        {trending.map((p) => <ProductCard key={p.id} product={p} onAdd={onAdd} />)}
      </HorizScroll>
    </section>
  );
}

function CategoriesSection({ products, categories, onAdd }: { products: Product[]; categories: { id: string; name: string; icon: string }[]; onAdd: (p: Product) => void }) {
  const [active, setActive] = useState("all");
  const [mobileDropdown, setMobileDropdown] = useState(false);
  const filtered = active === "all" ? products : products.filter((p) => p.category === active);
  const row1 = filtered.slice(0, Math.ceil(filtered.length / 2));
  const row2 = filtered.slice(Math.ceil(filtered.length / 2));
  const activeCategory = categories.find((c) => c.id === active);

  return (
    <section id="categories" className="py-12 px-4 sm:px-6 bg-wood-100/60">
      <div className="max-w-7xl mx-auto">
        <SectionTitle icon={FolderOpen} label="Browse" title="Shop by" accent="Category" />

        <div className="hidden sm:flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-body font-medium transition-all ${
                active === cat.id
                  ? "gradient-brand text-white shadow-md shadow-forest/20"
                  : "bg-white text-muted border border-border hover:border-forest/30"
              }`}
            >
              <CategoryIcon icon={cat.icon} className="w-4 h-4" />
              {cat.name}
            </button>
          ))}
        </div>

        <div className="sm:hidden mb-6 relative">
          <button
            onClick={() => setMobileDropdown(!mobileDropdown)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl font-body font-medium text-sm bg-white border border-forest/30 text-forest"
          >
            <span className="flex items-center gap-2">
              {activeCategory && <CategoryIcon icon={activeCategory.icon} />}
              {activeCategory?.name}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${mobileDropdown ? "rotate-180" : ""}`} />
          </button>
          {mobileDropdown && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden bg-white border border-border shadow-xl">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setActive(cat.id); setMobileDropdown(false); }}
                  className={`w-full px-4 py-3 text-left text-sm font-body flex items-center gap-2 ${
                    active === cat.id ? "text-forest bg-forest/5" : "text-muted"
                  }`}
                >
                  <CategoryIcon icon={cat.icon} />
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-12 font-body text-muted">No products in this category yet.</p>
        ) : (
          <div className="space-y-4">
            <HorizScroll>{row1.map((p) => <ProductCard key={p.id} product={p} onAdd={onAdd} />)}</HorizScroll>
            {row2.length > 0 && <HorizScroll>{row2.map((p) => <ProductCard key={p.id} product={p} onAdd={onAdd} />)}</HorizScroll>}
          </div>
        )}
      </div>
    </section>
  );
}

function OffersSection({ products, onAdd }: { products: Product[]; onAdd: (p: Product) => void }) {
  const offers = products.filter((p) => p.isOffer && p.discount);
  return (
    <section id="offers" className="py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionTitle icon={Tag} label="Limited Time" title="Special" accent="Offers" />
        <HorizScroll>
          {offers.map((p) => (
            <div key={p.id} className="flex-shrink-0 rounded-2xl overflow-hidden relative surface-elevated" style={{ width: "280px" }}>
              <div className="absolute top-0 left-0 right-0 h-1 gradient-brand" />
              <div className="flex gap-3 p-4">
                <img src={p.image} alt={p.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-wood-100" />
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white mb-1 gradient-brand">{p.discount}% OFF</span>
                  <p className="font-display font-bold text-charcoal text-sm truncate">{p.name}</p>
                  <p className="font-body text-xs text-muted mb-1">{p.brand}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-sm text-amber-warm">{fmt(p.price)}</span>
                    {p.originalPrice && <span className="font-body text-xs line-through text-muted">{fmt(p.originalPrice)}</span>}
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <button onClick={() => onAdd(p)} className="w-full py-2.5 rounded-xl text-sm font-display font-bold text-white gradient-brand shadow-md shadow-forest/20">
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </HorizScroll>
      </div>
    </section>
  );
}

function AboutSection({ reviews }: { reviews: { id: string; name: string; rating: number; comment: string; imageKey: string; product: string; date: string }[] }) {
  const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
  return (
    <section id="about" className="py-16 px-4 sm:px-6 bg-wood-100/60">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16 items-center">
          <div>
            <SectionTitle icon={Store} label="About Us" title="Your Trusted" accent="Mobile Shop" />
            <p className="font-body text-base leading-relaxed text-muted mb-4">
              SS Mobile Weligama has been serving the community since 2019. Our warm wood-paneled store is stocked with the latest phones from Samsung, Apple, Xiaomi, OPPO, vivo, Nokia, and Huawei.
            </p>
            <p className="font-body text-base leading-relaxed text-muted mb-6">
              Every product comes with manufacturer warranty, and our certified technicians handle repairs while you wait. Honest pricing, genuine products, and friendly service.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[["500+", "Happy Customers"], ["6+", "Years Experience"], ["1000+", "Products Sold"]].map(([val, lbl]) => (
                <div key={lbl} className="p-4 rounded-xl text-center surface-card">
                  <div className="font-display font-black text-2xl text-gradient mb-1">{val}</div>
                  <div className="font-body text-xs text-muted">{lbl}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img src={aboutImg} alt="SS Mobile Weligama store interior" className="w-full rounded-2xl object-cover h-[400px] border border-border shadow-xl" />
            <div className="absolute -bottom-4 -left-4 p-4 rounded-2xl gradient-brand shadow-lg shadow-forest/30">
              <p className="font-display font-black text-white text-2xl leading-none">7</p>
              <p className="font-body text-white text-xs font-semibold leading-tight">Days<br />Open</p>
            </div>
          </div>
        </div>

        <SectionTitle icon={Star} label="Testimonials" title="What Our" accent="Customers Say" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((review, i) => (
            <div key={review.id} className="p-5 rounded-2xl surface-card animate-fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={feedbackImages[review.imageKey] || feedback1}
                  alt={review.name}
                  className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-forest/30"
                  style={{ objectPosition: "top" }}
                  onError={(event) => {
                    event.currentTarget.src = feedback1;
                  }}
                />
                <div>
                  <p className="font-display font-semibold text-charcoal text-sm">{review.name}</p>
                  <p className="font-body text-xs text-forest mb-0.5">{review.product}</p>
                  <p className="text-xs text-amber-warm">{stars(review.rating)}</p>
                </div>
              </div>
              <p className="font-body text-sm leading-relaxed text-muted">&ldquo;{review.comment}&rdquo;</p>
              <p className="font-body text-xs mt-3 text-muted/70">{review.date}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandsSection({ brands }: { brands: { id: string; name: string; color: string; textColor?: string; bgImageUrl?: string }[] }) {
  return (
    <section className="py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionTitle icon={Handshake} label="Partners" title="Our Brands &" accent="Partners" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="relative flex items-center justify-center rounded-2xl font-display font-black text-sm transition-all hover:scale-105 cursor-pointer overflow-hidden min-h-[88px] shadow-md"
              style={{
                background: brand.bgImageUrl
                  ? `url(${brand.bgImageUrl}) center/cover no-repeat`
                  : brand.color,
                color: brand.textColor || "#fff",
              }}
            >
              {brand.bgImageUrl && (
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/50 to-charcoal/30" />
              )}
              <span className="relative z-10 text-center px-2 drop-shadow-lg tracking-tight">{brand.name}</span>
            </div>
          ))}
        </div>
        <p className="text-center mt-6 font-body text-sm text-muted">
          Authorized dealer for all major brands. All products carry manufacturer warranty.
        </p>
      </div>
    </section>
  );
}

function ContactSection({ brands }: { brands: { name: string }[] }) {
  const contactItems = [
    { icon: MapPin, label: "Address", value: "No 120/A Welipitiya, Weligama, Southern Province, Sri Lanka" },
    { icon: Phone, label: "Phone", value: "074 290 2008 / 075 255 2008", href: "tel:+94742902008" },
    { icon: Clock, label: "Hours", value: "Monday–Sunday: 8:00 AM – 9:00 PM" },
    { icon: MessageCircle, label: "WhatsApp", value: "Chat with us on WhatsApp", href: "https://wa.me/94742902008" },
  ];

  return (
    <section id="contact" className="py-16 px-4 sm:px-6 bg-charcoal text-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body font-semibold mb-2 bg-forest/20 text-amber-warm border border-forest/30">
            <MapPin className="w-3.5 h-3.5" />
            Find Us
          </span>
          <h2 className="font-display font-black text-white" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>
            Contact & <span className="text-amber-warm">Location</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="rounded-2xl overflow-hidden h-80 border border-white/10">
            <iframe
              title="SS Mobile Weligama Location"
              src="https://www.openstreetmap.org/export/embed.html?bbox=80.418%2C5.970%2C80.440%2C5.982&layer=mapnik&marker=5.976%2C80.430"
              className="w-full h-full"
            />
          </div>
          <div className="space-y-4">
            {contactItems.map((item) => (
              <div key={item.label} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <item.icon className="w-6 h-6 text-amber-warm flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-body text-xs font-semibold text-amber-warm mb-0.5">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="font-body text-sm text-white/90 hover:text-amber-warm transition-colors">{item.value}</a>
                  ) : (
                    <p className="font-body text-sm text-white/90">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <p className="font-display font-bold text-white text-sm mb-3">SS Mobile Weligama</p>
              <p className="font-body text-xs text-white/50 leading-relaxed">Premium Phones, Perfect Choice. Your trusted mobile partner in Weligama.</p>
            </div>
            <div>
              <p className="font-display font-semibold text-white text-sm mb-3">Quick Links</p>
              <div className="space-y-2">
                {["Home", "Browse Products", "Offers", "About Us", "Repairs"].map((l) => (
                  <p key={l} className="font-body text-xs text-white/50">{l}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="font-display font-semibold text-white text-sm mb-3">Brands We Carry</p>
              <div className="space-y-2">
                {brands.map((b) => (
                  <p key={b.name} className="font-body text-xs text-white/50">{b.name}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-body text-xs text-white/40">© 2025 SS Mobile Weligama. All rights reserved.</p>
            <p className="font-body text-xs text-white/40">No 120/A Welipitiya, Weligama · 074 290 2008</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home({ onAddToCart, onBrowse }: HomeProps) {
  const { products, categories, brands, reviews } = useStore();
  const [addedId, setAddedId] = useState<string | null>(null);

  const handleAdd = (p: Product) => {
    onAddToCart(p);
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 1800);
  };

  const stats = [
    { icon: Smartphone, val: "500+", lbl: "Phones In Stock" },
    { icon: Star, val: "4.9", lbl: "Customer Rating" },
    { icon: Wrench, val: "Same Day", lbl: "Repair Service" },
    { icon: Truck, val: "Island-wide", lbl: "Delivery Available" },
  ];

  return (
    <div className="min-h-screen">
      <HeroCarousel onShopNow={onBrowse} />

      {addedId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl font-body font-semibold text-sm text-white animate-fade-up gradient-brand shadow-lg shadow-forest/30 flex items-center gap-2">
          <Check className="w-4 h-4" />
          Added to cart!
        </div>
      )}

      <div className="py-6 px-4 sm:px-6 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {stats.map(({ icon: Icon, val, lbl }) => (
            <div key={lbl} className="flex flex-col items-center">
              <Icon className="w-6 h-6 text-forest mb-2" strokeWidth={1.75} />
              <p className="font-display font-black text-charcoal text-lg leading-none">{val}</p>
              <p className="font-body text-xs text-muted">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      <TrendingSection products={products} onAdd={handleAdd} onBrowse={onBrowse} />
      <CategoriesSection products={products} categories={categories} onAdd={handleAdd} />
      <OffersSection products={products} onAdd={handleAdd} />
      <AboutSection reviews={reviews} />
      <BrandsSection brands={brands} />
      <ContactSection brands={brands} />
    </div>
  );
}
