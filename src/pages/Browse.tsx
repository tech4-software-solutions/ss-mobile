import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, Flame, ShoppingCart, Check } from "lucide-react";
import type { Product } from "../types";
import { useStore } from "../context/StoreContext";
import { CategoryIcon } from "../lib/icons";

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

interface BrowseProps {
  onAddToCart: (p: Product) => void;
}

function ProductCard({ product, onAdd, delay }: { product: Product; onAdd: (p: Product) => void; delay: number }) {
  const [hovered, setHovered] = useState(false);
  const [added, setAdded] = useState(false);
  const { categories } = useStore();

  const handleAdd = () => {
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const cat = categories.find((c) => c.id === product.category);

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-300 animate-fade-up flex flex-col surface-card ${
        hovered ? "shadow-xl shadow-forest/10 -translate-y-1 border-forest/20" : ""
      }`}
      style={{ animationDelay: `${delay}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-[200px] bg-wood-100 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-500 ${hovered ? "scale-105" : ""}`}
        />
        {product.discount && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-bold text-white gradient-brand">
            {product.discount}% OFF
          </span>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-charcoal/60">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-muted">Out of Stock</span>
          </div>
        )}
        {product.trending && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-warm/20 text-amber-warm border border-amber-warm/30 flex items-center gap-1">
            <Flame className="w-3 h-3" /> Hot
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-1">
            <span className="font-body text-xs font-semibold text-forest">{product.brand}</span>
            {cat && <CategoryIcon icon={cat.icon} className="w-4 h-4 text-muted" />}
          </div>
          <h3 className="font-display font-bold text-charcoal text-sm mb-1 leading-tight">{product.name}</h3>
          <p className="font-body text-xs text-muted mb-3 line-clamp-2">{product.description}</p>
          <div className="flex flex-wrap gap-1 mb-3">
            {Object.entries(product.specs).slice(0, 2).map(([k, v]) => (
              <span key={k} className="px-2 py-0.5 rounded-md text-[10px] font-body bg-wood-50 text-muted border border-border">
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="font-display font-black text-base text-amber-warm">{fmt(product.price)}</span>
            {product.originalPrice && (
              <span className="font-body text-xs line-through text-muted ml-2">{fmt(product.originalPrice)}</span>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={!product.inStock}
            className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all flex items-center gap-1.5 ${
              added
                ? "bg-forest text-white"
                : product.inStock
                  ? "gradient-brand text-white shadow-md shadow-forest/20"
                  : "bg-wood-100 text-muted cursor-not-allowed"
            }`}
          >
            {added ? <Check className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
            {added ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Browse({ onAddToCart }: BrowseProps) {
  const { products, categories } = useStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc" | "name">("default");

  const filtered = useMemo(() => {
    let result = products;
    if (category !== "all") result = result.filter((p) => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    if (sort === "price-asc") result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") result = [...result].sort((a, b) => b.price - a.price);
    if (sort === "name") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [products, category, search, sort]);

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-black text-charcoal text-3xl mb-2">
            Browse <span className="text-gradient">Products</span>
          </h1>
          <p className="font-body text-muted">{products.length} products available</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search phones, brands, accessories..."
              className="w-full pl-10 pr-4 py-3 rounded-xl font-body text-sm bg-white border border-border outline-none focus:border-forest/40 focus:ring-2 focus:ring-forest/10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-3 rounded-xl font-body text-sm bg-white border border-border outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="px-4 py-3 rounded-xl font-body text-sm bg-white border border-border outline-none flex items-center"
            >
              <option value="default">Default</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all ${
                category === cat.id
                  ? "gradient-brand text-white"
                  : "bg-white text-muted border border-border hover:border-forest/30"
              }`}
            >
              <CategoryIcon icon={cat.icon} className="w-3.5 h-3.5" />
              {cat.name}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <SlidersHorizontal className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="font-body text-muted">No products match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} onAdd={onAddToCart} delay={i * 0.03} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
