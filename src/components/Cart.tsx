import { useState } from "react";
import { X, Minus, Plus, Trash2, Store, Truck, Tag, CheckCircle, Loader2 } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import type { CartItem, CheckoutDetails } from "../types";
import { validatePromoCode, createPaymentIntent } from "../lib/api";
import { getStripe, isStripeConfigured } from "../lib/stripe";
import { isSupabaseConfigured } from "../lib/supabase";
import { validateCheckoutDetails, sanitizeText } from "../lib/validation";
import CheckoutForm from "./CheckoutForm";

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onClearCart: () => void;
}

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

export default function Cart({
  isOpen,
  onClose,
  items,
  onUpdateQty,
  onRemove,
  onClearCart,
}: CartProps) {
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("pickup");
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<{
    code: string;
    discount: number;
    type: "percent" | "fixed";
  } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout" | "payment" | "done">("cart");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [details, setDetails] = useState<CheckoutDetails>({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    deliveryMethod: "pickup",
    address: "",
  });

  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const deliveryFee = delivery === "delivery" ? 350 : 0;

  let discountAmount = 0;
  if (promoApplied) {
    discountAmount =
      promoApplied.type === "percent"
        ? Math.round(subtotal * promoApplied.discount / 100)
        : promoApplied.discount;
  }
  const total = Math.max(0, subtotal + deliveryFee - discountAmount);

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");

    if (!isSupabaseConfigured) {
      setPromoError("Promo codes require a secure backend connection");
      setPromoLoading(false);
      return;
    }

    const result = await validatePromoCode(promoInput, subtotal);
    if (result.valid && result.code && result.discount && result.type) {
      setPromoApplied({ code: result.code, discount: result.discount, type: result.type });
    } else {
      setPromoError(result.message || "Invalid promo code");
    }
    setPromoLoading(false);
  };

  const startCheckout = () => {
    setDetails((d) => ({ ...d, deliveryMethod: delivery, promoCode: promoApplied?.code }));
    setStep("checkout");
    setCheckoutError("");
  };

  const proceedToPayment = async () => {
    const checkoutDetails: CheckoutDetails = {
      ...details,
      customerName: sanitizeText(details.customerName, 80),
      customerPhone: sanitizeText(details.customerPhone, 20),
      customerEmail: details.customerEmail ? sanitizeText(details.customerEmail, 254) : "",
      deliveryMethod: delivery,
      promoCode: promoApplied?.code,
      address: details.address ? sanitizeText(details.address, 300) : undefined,
    };

    const validationError = validateCheckoutDetails(checkoutDetails);
    if (validationError) {
      setCheckoutError(validationError);
      return;
    }

    if (!isStripeConfigured || !isSupabaseConfigured) {
      setCheckoutError("Secure payment is not configured. Please contact the store.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError("");

    const result = await createPaymentIntent(items, checkoutDetails);
    if ("error" in result) {
      setCheckoutError(result.error);
      setCheckoutLoading(false);
      return;
    }
    setClientSecret(result.clientSecret);
    setStep("payment");
    setCheckoutLoading(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep("cart");
      setClientSecret(null);
      setCheckoutError("");
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]" onClick={handleClose}>
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />

      <div
        className="absolute top-0 right-0 h-full animate-slide-in flex flex-col bg-cream border-l border-border"
        style={{ width: "min(440px, 100vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-charcoal text-lg">
              {step === "done" ? "Order Confirmed" : step === "payment" ? "Payment" : "Shopping Cart"}
            </h2>
            <p className="text-xs font-body text-muted">
              {step === "cart" && `${items.length} item${items.length !== 1 ? "s" : ""}`}
              {step === "checkout" && "Enter your details"}
              {step === "payment" && "Secure checkout"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-wood-100 hover:bg-wood-200 transition-all"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {step === "done" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full gradient-brand flex items-center justify-center mb-4 shadow-lg shadow-forest/20">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="font-display font-bold text-charcoal text-xl mb-2">Order Placed!</h3>
            <p className="font-body text-sm text-muted mb-1">Thank you for shopping with SS Mobile.</p>
            <p className="font-body text-sm text-muted mb-6">
              We will contact you at{" "}
              <a href="tel:+94742902008" className="text-forest font-semibold">074 290 2008</a>
            </p>
            <button onClick={handleClose} className="gradient-brand text-white font-display font-bold px-6 py-3 rounded-xl">
              Continue Shopping
            </button>
          </div>
        ) : items.length === 0 && step === "cart" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full mb-4 flex items-center justify-center bg-forest/10">
              <Store className="w-10 h-10 text-forest" />
            </div>
            <h3 className="font-display font-bold text-charcoal text-lg mb-1">Your cart is empty</h3>
            <p className="font-body text-sm text-muted mb-6">Add some products to get started</p>
            <button onClick={handleClose} className="gradient-brand text-white font-display font-bold px-6 py-3 rounded-xl">
              Browse Products
            </button>
          </div>
        ) : step === "payment" && clientSecret ? (
          <div className="flex-1 overflow-y-auto p-5">
            <Elements stripe={getStripe()} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#2D6B3F" } } }}>
              <CheckoutForm
                total={total}
                onSuccess={() => {
                  setStep("done");
                  onClearCart();
                }}
                onError={setCheckoutError}
              />
            </Elements>
            {checkoutError && <p className="text-sm text-red-600 mt-3">{checkoutError}</p>}
          </div>
        ) : step === "checkout" ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-body font-semibold text-muted mb-1">Full Name *</label>
              <input
                value={details.customerName}
                onChange={(e) => setDetails((d) => ({ ...d, customerName: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-body bg-wood-50 border border-border outline-none focus:border-forest/40"
              />
            </div>
            <div>
              <label className="block text-xs font-body font-semibold text-muted mb-1">Phone *</label>
              <input
                value={details.customerPhone}
                onChange={(e) => setDetails((d) => ({ ...d, customerPhone: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-body bg-wood-50 border border-border outline-none focus:border-forest/40"
                placeholder="07X XXX XXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-body font-semibold text-muted mb-1">Email</label>
              <input
                type="email"
                value={details.customerEmail}
                onChange={(e) => setDetails((d) => ({ ...d, customerEmail: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-body bg-wood-50 border border-border outline-none focus:border-forest/40"
              />
            </div>
            {delivery === "delivery" && (
              <div>
                <label className="block text-xs font-body font-semibold text-muted mb-1">Delivery Address *</label>
                <textarea
                  value={details.address}
                  onChange={(e) => setDetails((d) => ({ ...d, address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-body bg-wood-50 border border-border outline-none focus:border-forest/40 resize-none"
                />
              </div>
            )}
            <div className="p-4 rounded-xl bg-wood-50 border border-border space-y-1.5">
              <div className="flex justify-between text-sm font-body text-muted">
                <span>Total</span>
                <span className="font-display font-bold text-forest">{fmt(total)}</span>
              </div>
            </div>
            {checkoutError && <p className="text-sm text-red-600">{checkoutError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep("cart")} className="flex-1 py-3 rounded-xl font-body text-sm text-muted bg-wood-100">
                Back
              </button>
              <button
                onClick={proceedToPayment}
                disabled={checkoutLoading}
                className="flex-1 gradient-brand text-white font-display font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue to Payment"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 p-3 rounded-xl surface-card">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-wood-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-charcoal text-sm truncate">{item.product.name}</p>
                    <p className="font-body text-xs text-forest mb-2">{fmt(item.product.price)}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-lg bg-wood-50 border border-border">
                        <button
                          onClick={() => onUpdateQty(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-muted hover:text-charcoal"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-charcoal">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQty(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-muted hover:text-charcoal"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button onClick={() => onRemove(item.product.id)} className="text-red-500 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 space-y-4 border-t border-border">
              <div>
                <p className="text-xs font-body font-semibold text-muted mb-2 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> DELIVERY METHOD
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["pickup", "delivery"] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setDelivery(method)}
                      className={`p-2.5 rounded-xl text-xs font-body font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
                        delivery === method
                          ? "bg-forest/10 border-forest/40 text-forest border"
                          : "bg-wood-50 border-border text-muted border"
                      }`}
                    >
                      {method === "pickup" ? <Store className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                      {method === "pickup" ? "Store Pickup" : "Delivery (+Rs.350)"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-body font-semibold text-muted mb-2 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> PROMO CODE
                </p>
                {promoApplied ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-forest/10 border border-forest/25">
                    <span className="text-sm font-body font-semibold text-forest">{promoApplied.code} applied</span>
                    <button onClick={() => setPromoApplied(null)} className="text-xs text-muted hover:text-charcoal">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value); setPromoError(""); }}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2.5 rounded-xl text-xs font-body bg-wood-50 border border-border outline-none focus:border-forest/40"
                    />
                    <button
                      onClick={applyPromo}
                      disabled={promoLoading}
                      className="gradient-brand text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-60"
                    >
                      {promoLoading ? "..." : "Apply"}
                    </button>
                  </div>
                )}
                {promoError && <p className="text-xs mt-1 text-red-600">{promoError}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-sm font-body text-muted">
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm font-body text-muted">
                    <span>Delivery</span><span>{fmt(deliveryFee)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm font-body text-forest">
                    <span>Discount</span><span>−{fmt(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-display font-bold text-charcoal text-base pt-2 border-t border-border">
                  <span>Total</span><span className="text-forest">{fmt(total)}</span>
                </div>
              </div>

              <button
                onClick={startCheckout}
                className="w-full gradient-brand text-white font-display font-bold py-3.5 rounded-xl transition-all hover:opacity-90 shadow-lg shadow-forest/20"
              >
                Checkout — {fmt(total)}
              </button>
              <p className="text-center text-xs font-body text-muted">
                Or call us: <a href="tel:+94742902008" className="text-forest font-semibold">074 290 2008</a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
