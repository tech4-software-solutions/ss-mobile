import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X } from "lucide-react";
import type { CartItem } from "../types";
import logoImg from "../imports/logo.jpg";

interface HeaderProps {
  cartItems: CartItem[];
  onCartOpen: () => void;
}

export default function Header({ cartItems, onCartOpen }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Browse", path: "/browse" },
    { label: "Offers", path: "/#offers" },
    { label: "About", path: "/#about" },
    { label: "Contact", path: "/#contact" },
  ];

  const handleNav = (path: string) => {
    setMobileOpen(false);
    if (path.startsWith("/#")) {
      const hash = path.slice(1);
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }), 300);
      } else {
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(path);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path.startsWith("/#")) return false;
    return location.pathname === path;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => handleNav("/")} className="flex items-center gap-2.5 group">
          <img
            src={logoImg}
            alt="SS Mobile Weligama"
            className="w-9 h-9 rounded-xl object-cover shadow-md ring-1 ring-border"
          />
          <div className="leading-tight text-left">
            <div className="font-display font-bold text-charcoal text-sm tracking-wide">SS Mobile</div>
            <div className="text-[10px] text-forest font-body font-medium">Weligama</div>
          </div>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, path }) => (
            <button
              key={label}
              onClick={() => handleNav(path)}
              className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-all ${
                isActive(path)
                  ? "text-forest bg-forest/10"
                  : "text-muted hover:text-charcoal hover:bg-wood-100"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={onCartOpen}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-forest/10 border border-forest/20 hover:bg-forest/15 transition-all"
            aria-label="Open cart"
          >
            <ShoppingBag className="w-5 h-5 text-forest" strokeWidth={2} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-brand text-white text-[10px] font-bold flex items-center justify-center animate-pulse-ring">
                {cartCount}
              </span>
            )}
          </button>

          <button
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center bg-wood-100 border border-border"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-charcoal" /> : <Menu className="w-5 h-5 text-charcoal" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden animate-fade-up bg-cream border-b border-border px-4 py-3">
          {navLinks.map(({ label, path }) => (
            <button
              key={label}
              onClick={() => handleNav(path)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-body font-medium mb-1 transition-all ${
                isActive(path) ? "text-forest bg-forest/10" : "text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
