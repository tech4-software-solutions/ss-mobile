import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useStore } from "../context/StoreContext";
import storeImg from "../imports/about_me.jpg";

interface HeroCarouselProps {
  onShopNow: () => void;
}

export default function HeroCarousel({ onShopNow }: HeroCarouselProps) {
  const { products } = useStore();
  const [active, setActive] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const featured = products.filter((p) => p.trending).slice(0, 2);

  const slides = [
    {
      id: "store",
      title: "Visit Our\nWeligama Store",
      subtitle: "No 120/A Welipitiya, Weligama — open 7 days a week",
      cta: "Get Directions",
      image: storeImg,
      badge: "Our Store",
      action: "directions" as const,
    },
    ...featured.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.brand} · ${p.description.slice(0, 60)}...`,
      cta: "Shop Now -",
      image: p.image,
      badge: p.discount ? `${p.discount}% OFF` : "New Arrival",
      action: "shop" as const,
    })),
  ];

  const go = useCallback(
    (idx: number) => {
      if (isAnimating || slides.length === 0) return;
      setIsAnimating(true);
      setActive(idx);
      setTimeout(() => setIsAnimating(false), 600);
    },
    [isAnimating, slides.length],
  );

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => go((active + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [active, go, slides.length]);

  if (slides.length === 0) return null;

  const current = slides[active];

  const handleCta = () => {
    if (current.action === "directions") {
      window.open("https://maps.google.com/?q=SS+Mobile+Weligama+Welipitiya", "_blank");
    } else {
      onShopNow();
    }
  };

  return (
    <section className="relative w-full overflow-hidden" style={{ height: "clamp(420px, 68vh, 720px)" }}>
      <div
        className="absolute inset-0 transition-transform duration-700"
        style={{
          backgroundImage: `url(${current.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: isAnimating ? "scale(1.04)" : "scale(1)",
        }}
      />
      <div className="absolute inset-0 cinematic-overlay" />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent" />

      <div className="relative h-full flex items-center pt-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 w-full">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body font-semibold mb-4 bg-forest/20 border border-forest/40 text-amber-warm animate-fade-up">
              {current.badge}
            </span>
            <h1
              key={current.id + "title"}
              className="font-display font-black text-white leading-[1.05] mb-4 animate-fade-up whitespace-pre-line"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              {current.title}
            </h1>
            <p className="font-body text-white/75 text-base mb-8 max-w-md leading-relaxed animate-fade-up">
              {current.subtitle}
            </p>
            <div className="flex flex-wrap gap-3 animate-fade-up">
              <button
                onClick={handleCta}
                className="gradient-brand text-white font-display font-bold px-7 py-3.5 rounded-xl transition-all hover:opacity-90 hover:scale-[1.02] shadow-lg shadow-forest/30"
              >
                {current.cta}
              </button>
              {current.action === "shop" && (
                <button
                  onClick={() => window.open("tel:+94742902008")}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-display font-semibold text-white border border-white/25 hover:bg-white/10 transition-all"
                >
                  <MapPin className="w-4 h-4" />
                  Call Store
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={() => go((active - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => go((active + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${i === active ? "w-8 bg-amber-warm" : "w-3 bg-white/40"}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
