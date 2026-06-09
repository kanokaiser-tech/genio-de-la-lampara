import { useRef } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";

interface Product {
  id: number;
  name: string;
  priceCash30: string | number;
  priceTransfer25: string | number;
  imageUrl?: string | null;
  slug?: string | null;
  category?: string;
  stock?: number;
  // Campos de oferta
  dealPrice?: string | number | null;
  dealType?: string | null;
}

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  badge?: string;
  emptyMessage?: string;
}

export function ProductCarousel({ title, subtitle, products, badge, emptyMessage }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (!products || products.length === 0) {
    if (emptyMessage) {
      return (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {badge && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">{badge}</span>}
          </div>
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        </div>
      );
    }
    return null;
  }

  const formatPrice = (p: string | number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(p));

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {badge && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">{badge}</span>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => scroll("left")} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => scroll("right")} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      {subtitle && <p className="text-xs text-gray-500 mb-3">{subtitle}</p>}

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((product) => {
          // Si tiene precio de oferta, mostrar oferta
          const hasDeal = product.dealPrice != null && Number(product.dealPrice) > 0;
          const isCashDeal = !product.dealType || product.dealType === "cash";

          return (
            <Link
              key={product.id}
              to={`/productos/${product.slug || product.id}`}
              className="flex-shrink-0 w-44 snap-start group"
            >
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all">
                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="w-10 h-10 text-gray-300" />
                  )}
                  {hasDeal && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      OFERTA
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs text-gray-500 truncate">{product.category}</p>
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight min-h-[2.2rem]">{product.name}</h3>

                  <div className="mt-1.5">
                    {hasDeal ? (
                      /* PRECIO DE OFERTA */
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(isCashDeal ? product.priceCash30 : product.priceTransfer25)}
                          </span>
                        </div>
                        <p className="text-lg font-extrabold text-red-600 leading-tight">
                          {formatPrice(product.dealPrice!)}
                        </p>
                        <p className="text-[10px] text-red-400 font-medium">
                          {isCashDeal ? "Precio efectivo" : "Precio transferencia"}
                        </p>
                      </div>
                    ) : (
                      /* PRECIO NORMAL */
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-blue-600">{formatPrice(product.priceCash30)}</p>
                        <p className="text-[10px] text-gray-400">Transf: {formatPrice(product.priceTransfer25)}</p>
                      </div>
                    )}
                  </div>

                  {product.stock !== undefined && product.stock <= 3 && product.stock > 0 && (
                    <p className="text-[10px] text-orange-500 mt-1">Quedan {product.stock}!</p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
