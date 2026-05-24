import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search, Plus, Package, Loader2, X, Menu, ChevronRight, ImageOff, Coins, Star, Zap } from "lucide-react";
import { useNavigate } from "react-router";

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showPromo, setShowPromo] = useState(false);
  const [bannerClosed, setBannerClosed] = useState(() => {
    return localStorage.getItem("goldPromoBannerClosed") === "1";
  });
  const [activeCategory, setActiveCategory] = useState<string>("Todas");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Extraer categorias unicas
  const categories: string[] = [];
  const seen = new Set<string>();
  products?.forEach(p => {
    const cat = p.category || "Sin categoria";
    if (!seen.has(cat)) { seen.add(cat); categories.push(cat); }
  });

  // Contar productos por categoria
  const catCount = (cat: string) =>
    cat === "Todas" ? (products?.length ?? 0) : (products?.filter(p => (p.category || "Sin categoria") === cat).length ?? 0);

  // Productos agrupados por categoria (con filtro activo)
  const grouped: Record<string, typeof products> = {};
  products?.forEach(p => {
    const cat = p.category || "Sin categoria";
    if (activeCategory !== "Todas" && cat !== activeCategory) return;
    const searchLower = search.toLowerCase().trim();
    if (searchLower) {
      const matches = p.name.toLowerCase().includes(searchLower) ||
        (p.category ?? "").toLowerCase().includes(searchLower);
      if (!matches) return;
    }
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat]!.push(p);
  });

  const scrollToProduct = useCallback((productId: number) => {
    setHighlightedId(productId);
    const el = productRefs.current[productId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightedId(null), 2500);
  }, []);

  const selectCategory = (cat: string) => {
    setActiveCategory(cat);
    setSidebarOpen(false);
    if (cat === "Todas") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = sectionRefs.current[cat];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSearchSubmit = () => {
    const searchLower = search.toLowerCase().trim();
    if (!searchLower || !products) return;
    const match = products.find(p =>
      p.name.toLowerCase().includes(searchLower) ||
      (p.category ?? "").toLowerCase().includes(searchLower)
    );
    if (match) {
      setActiveCategory("Todas");
      setTimeout(() => scrollToProduct(match.id), 100);
    }
  };

  const handleQty = (id: number, d: number) => setQtys(prev => ({ ...prev, [id]: Math.max(1, (prev[id] ?? 1) + d) }));
  const handleAdd = (pid: number) => { addCart.mutate({ productId: pid, quantity: qtys[pid] ?? 1 }); setQtys(p => ({ ...p, [pid]: 1 })); };

  // Modal promo: solo primera vez por sesion
  useEffect(() => {
    const dismissed = sessionStorage.getItem("goldPromoModal");
    if (!dismissed) setShowPromo(true);
  }, []);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* ===== MODAL PROMO MONEDAS DE ORO ===== */}
      {showPromo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl max-w-xs w-full shadow-2xl overflow-hidden relative">
            {/* Boton cerrar en esquina */}
            <button
              onClick={() => { setShowPromo(false); sessionStorage.setItem("goldPromoModal", "1"); }}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/40"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="bg-yellow-500 p-3 text-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-1.5">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">Monedas de Oro</h2>
              <p className="text-yellow-100 text-xs mt-0.5">Compra y gana en cada pedido</p>
            </div>
            <div className="p-3 space-y-2">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                <p className="text-xs text-gray-700 leading-tight">
                  <strong>Sumas monedas</strong> que podes usar como <strong>descuento</strong> en tus proximas compras.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2">
                <Zap className="w-4 h-4 text-green-600 shrink-0" />
                <div>
                  <p className="font-bold text-green-800 text-xs leading-tight">PAGA EN EFECTIVO Y SUMA DOBLE</p>
                  <p className="text-[10px] text-green-600 leading-tight">1% efectivo vs 0.5% transfer</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { setShowPromo(false); sessionStorage.setItem("goldPromoModal", "1"); }} className="flex-1 h-8 text-xs bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-2">
                  <Star className="w-3 h-3 mr-1" /> Entendido
                </Button>
                <Button variant="ghost" onClick={() => { setShowPromo(false); sessionStorage.setItem("goldPromoModal", "1"); }} className="h-8 text-[10px] text-gray-500 px-2">
                  No mostrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== BANNER STICKY MONEDAS ===== */}
      {!bannerClosed && (
        <div className="bg-yellow-500 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" /> PAGA EN EFECTIVO Y SUMA DOBLE
              </p>
              <p className="text-yellow-100 text-xs">
                Suma monedas de oro con cada compra y usalas para descuentos!
              </p>
            </div>
          </div>
          <button
            onClick={() => { setBannerClosed(true); localStorage.setItem("goldPromoBannerClosed", "1"); }}
            className="p-1 text-white/80 hover:text-white shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* STICKY HEADER + BUSCADOR */}
      <div className="sticky top-0 z-30 bg-gray-50 -mx-4 px-4 py-3 -mt-4 mb-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Boton sidebar mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden border-gray-300 text-gray-700 h-8 w-8 p-0"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Catalogo
            </h1>
          </div>
          <Button onClick={() => navigate("/pedido")} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 h-8 text-xs px-3">
            <ShoppingCart className="w-4 h-4 mr-1" />
            {cartCount > 0 && <span className="bg-white text-blue-600 rounded-full px-1.5 py-0.5 text-xs font-bold mr-1">{cartCount}</span>}
            Pedido
          </Button>
        </div>

        {/* Buscador */}
        <div>
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
            <button onClick={() => { setSearch(""); setHighlightedId(null); setActiveCategory("Todas"); inputRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
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
      </div>

      {/* Layout: Sidebar + Contenido */}
      <div className="flex gap-6">
        {/* SIDEBAR CATEGORIAS - Desktop */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="sticky top-20 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categorias</p>
            </div>
            <div className="py-2">
              <button
                onClick={() => selectCategory("Todas")}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                  activeCategory === "Todas" ? "bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>Todas</span>
                <span className={`text-xs ${activeCategory === "Todas" ? "text-blue-500" : "text-gray-400"}`}>{catCount("Todas")}</span>
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => selectCategory(cat)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                    activeCategory === cat ? "bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate pr-2">{cat}</span>
                  <span className={`text-xs shrink-0 ${activeCategory === cat ? "text-blue-500" : "text-gray-400"}`}>{catCount(cat)}</span>
                </button>
              ))}
            </div>
            {/* Info monedas de oro en sidebar */}
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" /> Monedas de Oro
              </p>
              <p className="text-xs text-gray-600 mb-2">
                Suma monedas con cada compra y usalas para descuentos!
              </p>
              <div className="bg-green-100 border border-green-200 rounded-lg p-2 mb-2">
                <p className="text-xs font-bold text-green-800 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Efectivo = doble
                </p>
                <p className="text-xs text-green-600">monedas</p>
              </div>
              <button
                onClick={() => setShowPromo(true)}
                className="w-full text-xs text-yellow-600 hover:text-yellow-700 font-medium underline text-center"
              >
                Ver mas info
              </button>
            </div>
          </div>
        </aside>

        {/* SIDEBAR CATEGORIAS - Mobile Drawer */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-50 md:hidden" onClick={() => setSidebarOpen(false)} />
            <div className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 md:hidden shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                <p className="font-semibold text-gray-900">Categorias</p>
                <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                <button
                  onClick={() => selectCategory("Todas")}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${
                    activeCategory === "Todas" ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600"
                  }`}
                >
                  <span className="flex items-center gap-2"><Package className="w-4 h-4" /> Todas</span>
                  <span className={`text-xs ${activeCategory === "Todas" ? "text-blue-500" : "text-gray-400"}`}>{catCount("Todas")}</span>
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => selectCategory(cat)}
                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${
                      activeCategory === cat ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate"><ChevronRight className="w-3.5 h-3.5 shrink-0" /> {cat}</span>
                    <span className={`text-xs shrink-0 ${activeCategory === cat ? "text-blue-500" : "text-gray-400"}`}>{catCount(cat)}</span>
                  </button>
                ))}
                {/* Info monedas mobile */}
                <div className="mx-4 mt-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5" /> Monedas de Oro
                  </p>
                  <p className="text-xs text-gray-600 mb-2">Ganas monedas en cada compra y las usas como descuento.</p>
                  <div className="bg-green-100 border border-green-200 rounded-lg p-2 mb-2">
                    <p className="text-xs font-bold text-green-800 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Efectivo: 1%
                    </p>
                    <p className="text-xs text-green-600">Transferencia: 0.5%</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 min-w-0">
          {/* Categoria activa badge */}
          {activeCategory !== "Todas" && (
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-sm px-3 py-1">
                {activeCategory}
              </Badge>
              <button onClick={() => selectCategory("Todas")} className="text-xs text-gray-500 hover:text-gray-700 underline">Ver todas</button>
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
              <Button variant="ghost" onClick={() => { setSearch(""); setActiveCategory("Todas"); }} className="mt-2 text-blue-600">Limpiar busqueda</Button>
            </div>
          )}

          {/* Productos por categoria */}
          {Object.entries(grouped).map(([cat, prods]) => (
            <div key={cat} ref={el => { sectionRefs.current[cat] = el; }} className="mb-8 scroll-mt-24" id={`cat-${cat.replace(/\s+/g, "-")}`}>
              <h2 className="text-lg font-bold text-blue-600 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-blue-600 rounded-full" />{cat} <span className="text-sm text-gray-400 font-normal">({prods?.length ?? 0})</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {prods?.map(p => {
                  const stockNum = Number(p.stock ?? 0);
                  const stockColor = stockNum <= 0 ? "text-red-500" : stockNum <= 5 ? "text-orange-500" : stockNum <= 10 ? "text-amber-500" : "text-green-600";
                  const isHighlighted = highlightedId === p.id;
                  return (
                    <div
                      key={p.id}
                      ref={el => { productRefs.current[p.id] = el; }}
                      className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden ${isHighlighted ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50/50 scale-[1.02]" : "border-gray-200"}`}
                    >
                      {/* Imagen del producto - Link a Tiendanube */}
                      <a
                        href={p.slug ? `https://geniodelalampara.com/productos/${p.slug}/` : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => { if (!p.slug) e.preventDefault(); }}
                        className={`relative w-full h-28 bg-gray-100 flex items-center justify-center overflow-hidden ${p.slug ? "cursor-pointer hover:opacity-90" : "cursor-default"}`}
                      >
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-gray-300">
                            <ImageOff className="w-8 h-8" />
                            <span className="text-xs">Sin imagen</span>
                          </div>
                        )}
                        {stockNum <= 5 && stockNum > 0 && (
                          <Badge className="absolute top-1.5 right-1.5 bg-orange-100 text-orange-600 border-orange-200 text-[9px] px-1 py-0">{stockNum}</Badge>
                        )}
                        {stockNum <= 0 && (
                          <Badge className="absolute top-1.5 right-1.5 bg-red-100 text-red-600 border-red-200 text-[9px] px-1 py-0">Sin</Badge>
                        )}
                      </a>
                      <div className="p-2.5">
                        <p className="font-semibold text-xs text-gray-900 line-clamp-2 mb-1.5 leading-tight">{p.name}</p>
                        <div className="mb-2">
                          <p className="text-blue-600 font-bold text-sm">{formatPrice(p[priceField])}</p>
                          <p className="text-[10px] text-gray-400 line-through">{formatPrice(p.priceList)}</p>
                          <p className={`text-[10px] font-medium ${stockColor}`}>Stock: {stockNum}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleQty(p.id, -1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-xs font-bold">-</button>
                            <span className="w-5 text-center text-xs font-medium text-gray-900">{qtys[p.id] ?? 1}</span>
                            <button onClick={() => handleQty(p.id, 1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-xs font-bold">+</button>
                          </div>
                          <Button size="sm" className="flex-1 h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleAdd(p.id)} disabled={stockNum <= 0}>
                            <Plus className="w-3 h-3 mr-0.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
