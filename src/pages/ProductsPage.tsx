import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search, Plus, Package, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router";

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todas");
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const catBarRef = useRef<HTMLDivElement>(null);
  const productRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: products, isLoading } = trpc.product.list.useQuery();
  const { data: cart } = trpc.cart.get.useQuery();
  const addCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      utils.cart.get.invalidate();
      utils.product.list.invalidate();
      setSearch("");
      setHighlightedId(null);
    },
  });

  const discountType = user?.discountType ?? "efectivo";
  const priceField: "priceCash30" | "priceTransfer25" = discountType === "efectivo" ? "priceCash30" : "priceTransfer25";
  const cartCount = cart?.reduce((s, i) => s + i.cartItems.quantity, 0) ?? 0;

  // Extraer categorías únicas
  const categories: string[] = [];
  const seen = new Set<string>();
  products?.forEach(p => {
    const cat = p.category || "Sin categoria";
    if (!seen.has(cat)) { seen.add(cat); categories.push(cat); }
  });
  const allCategories = ["Todas", ...categories];

  // Productos agrupados por categoría (con filtro activo)
  const grouped: Record<string, typeof products> = {};
  products?.forEach(p => {
    const cat = p.category || "Sin categoria";
    // Filtro por categoría seleccionada
    if (activeCategory !== "Todas" && cat !== activeCategory) return;
    // Filtro por búsqueda
    const searchLower = search.toLowerCase().trim();
    if (searchLower) {
      const matches = p.name.toLowerCase().includes(searchLower) ||
        (p.category ?? "").toLowerCase().includes(searchLower);
      if (!matches) return;
    }
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat]!.push(p);
  });

  // Scroll a un producto específico
  const scrollToProduct = useCallback((productId: number) => {
    setHighlightedId(productId);
    const el = productRefs.current[productId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Quitar highlight después de 2 segundos
    setTimeout(() => setHighlightedId(null), 2500);
  }, []);

  // Scroll a una categoría
  const scrollToCategory = useCallback((cat: string) => {
    if (cat === "Todas") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActiveCategory("Todas");
      return;
    }
    const el = sectionRefs.current[cat];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActiveCategory(cat);
  }, []);

  // Buscar y scrollear al primer resultado
  const handleSearchSubmit = () => {
    const searchLower = search.toLowerCase().trim();
    if (!searchLower || !products) return;

    // Buscar primer producto que coincida
    const match = products.find(p =>
      p.name.toLowerCase().includes(searchLower) ||
      (p.category ?? "").toLowerCase().includes(searchLower)
    );

    if (match) {
      // Activar la categoría del producto encontrado
      const cat = match.category || "Sin categoria";
      setActiveCategory("Todas"); // primero mostrar todas para que esté renderizado
      setTimeout(() => {
        scrollToProduct(match.id);
      }, 100);
    }
  };

  const handleQty = (id: number, d: number) => setQtys(prev => ({ ...prev, [id]: Math.max(1, (prev[id] ?? 1) + d) }));
  const handleAdd = (pid: number) => { addCart.mutate({ productId: pid, quantity: qtys[pid] ?? 1 }); setQtys(p => ({ ...p, [pid]: 1 })); };

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        // click outside
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* === Header y carrito === */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" /> Catalogo
        </h1>
        <Button onClick={() => navigate("/pedido")} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
          <ShoppingCart className="w-4 h-4 mr-2" />
          {cartCount > 0 && <span className="bg-white text-blue-600 rounded-full px-1.5 py-0.5 text-xs font-bold mr-1.5">{cartCount}</span>}
          Ir al pedido
        </Button>
      </div>

      {/* === Buscador que scrollea al resultado === */}
      <div className="mb-4" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            ref={inputRef}
            placeholder="Buscar producto... (ej: cargador, lampara, modulo)"
            value={search}
            onChange={e => { setSearch(e.target.value); if (e.target.value === "") setHighlightedId(null); }}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSearchSubmit(); } }}
            className="pl-12 pr-10 py-5 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 text-base shadow-sm"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setHighlightedId(null); setActiveCategory("Todas"); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {search.trim() && (
          <p className="text-xs text-gray-400 mt-1.5 ml-1">
            Presiona <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Enter</kbd> para ir al resultado
          </p>
        )}
      </div>

      {/* === Barra de categorías === */}
      {categories.length > 0 && (
        <div className="mb-6" ref={catBarRef}>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {allCategories.map(cat => {
              const count = cat === "Todas"
                ? (products?.length ?? 0)
                : (grouped[cat]?.length ?? (products?.filter(p => (p.category || "Sin categoria") === cat).length ?? 0));
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => scrollToCategory(cat)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {cat} <span className={`text-xs ${isActive ? "text-blue-100" : "text-gray-400"}`}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(!products || products.length === 0) && (
        <div className="text-center py-16 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay productos disponibles</p>
        </div>
      )}

      {Object.keys(grouped).length === 0 && search.trim() && (
        <div className="text-center py-16 text-gray-500 bg-white border border-gray-200 rounded-xl">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No se encontraron productos para <strong className="text-gray-900">"{search}"</strong></p>
          <Button variant="ghost" onClick={() => { setSearch(""); setActiveCategory("Todas"); }} className="mt-2 text-blue-600">
            Limpiar busqueda
          </Button>
        </div>
      )}

      {/* === Productos por categoria === */}
      {Object.entries(grouped).map(([cat, prods]) => (
        <div
          key={cat}
          ref={el => { sectionRefs.current[cat] = el; }}
          className="mb-8 scroll-mt-24"
          id={`cat-${cat.replace(/\s+/g, "-")}`}
        >
          <h2 className="text-lg font-bold text-blue-600 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-600 rounded-full" />{cat} <span className="text-sm text-gray-400 font-normal">({prods?.length ?? 0})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prods?.map(p => {
              const stockNum = Number(p.stock ?? 0);
              const stockColor = stockNum <= 0 ? "text-red-500" : stockNum <= 5 ? "text-orange-500" : stockNum <= 10 ? "text-amber-500" : "text-green-600";
              const isHighlighted = highlightedId === p.id;
              return (
                <div
                  key={p.id}
                  ref={el => { productRefs.current[p.id] = el; }}
                  className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${
                    isHighlighted
                      ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50/50 scale-[1.02]"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-sm text-gray-900 line-clamp-2 flex-1">{p.name}</p>
                    {stockNum <= 5 && stockNum > 0 && <Badge className="bg-orange-100 text-orange-600 border-orange-200 text-xs">Quedan {stockNum}</Badge>}
                    {stockNum <= 0 && <Badge className="bg-red-100 text-red-600 border-red-200 text-xs">Sin stock</Badge>}
                  </div>

                  <div className="mb-3">
                    <p className="text-blue-600 font-bold text-lg">{formatPrice(p[priceField])} c/u</p>
                    <p className="text-xs text-gray-400 line-through">Lista: {formatPrice(p.priceList)}</p>
                    <p className={`text-xs font-medium mt-0.5 ${stockColor}`}>Stock: {stockNum} unidades</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleQty(p.id, -1)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold">-</button>
                      <span className="w-8 text-center font-medium text-gray-900">{qtys[p.id] ?? 1}</span>
                      <button onClick={() => handleQty(p.id, 1)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold">+</button>
                    </div>
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleAdd(p.id)}
                      disabled={stockNum <= 0}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
