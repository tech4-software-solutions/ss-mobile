import { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import type { CartItem, Product } from "./types";
import Header from "./components/Header";
import Cart from "./components/Cart";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import ProtectedRoute from "./components/ProtectedRoute";

function Storefront() {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCartItems((prev) =>
        prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i)),
      );
    }
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => setCartItems([]);

  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen gradient-wood text-charcoal">
      {!isAdminRoute && (
        <Header
          cartItems={cartItems}
          onCartOpen={() => setCartOpen(true)}
        />
      )}

      <Routes>
        <Route
          path="/"
          element={
            <Home
              onAddToCart={addToCart}
              onBrowse={() => navigate("/browse")}
            />
          }
        />
        <Route
          path="/browse"
          element={<Browse onAddToCart={addToCart} />}
        />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Routes>

      {!isAdminRoute && (
        <Cart
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          items={cartItems}
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          onClearCart={clearCart}
        />
      )}
    </div>
  );
}

export default function App() {
  return <Storefront />;
}
