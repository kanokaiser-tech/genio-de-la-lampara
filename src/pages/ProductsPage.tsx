import { useState, useRef, useEffect } from "react";
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
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading } = trpc.product.list.useQuery();
  const { data: cart } = trpc.cart.get.useQuery();
  const addCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      utils.cart.get.invalidate();
      utils.product.list.invalidate();
      setSearch("");
      setShowDropdown(false);
      setActiveIndex(-1);
    },
  });

  const discountType = user?.discountType ?? "efectivo";
  const priceField: "priceCash30" | "priceTransfer25" = discountType === "efectivo" ? "priceCash30" : "priceTransfer25";
  const cartCount = cart?.reduce((s, i) => s + i.cartItems.quantity, 0) ?? 0;

  // Productos filtrados para el dropdown
  const filtered = search.length >= 1
    ? products?.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : [];

  // Agregar al carrito directo del dropdown
  const handleAddFromDropdown = (pid: number) => {
    addCart.mutate({ productId: pid, quantity: 1 });
    if (inputRef.current) inputRef.current.focus();
  };

  // Productos agrupados por categoria (para la vista de abajo)
  const grouped: Record<string, typeof products> = {};
  products?.forEach(p => {
    const cat = p.category || "Sin categoria";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat]!.push(p);
  });

  const handleQty = (id: number, d: number) => setQtys(prev => ({ ...prev, [id]: Math.max(1, (prev[id] ?? 1) + d) }));
  const handleAdd = (pid: number) => { addCart.mutate({ productId: pid, quantity: qtys[pid] ?? 1 }); setQtys(p => ({ ...p, [pid]: 1 })); };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || !filtered || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        handleAddFromDropdown(filtered[activeIndex].id);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
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
      {/* === Buscador principal con dropdown === */}
      <div className="mb-6">
        <div ref={searchRef} className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              ref={inputRef}
              placeholder="Buscar producto... (ej: cargador, lampara, etc.)"
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true); setActiveIndex(-1); }}
              onFocus={() => search.length >= 1 && setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              className="pl-12 pr-10 py-6 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 text-lg shadow-sm"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setShowDropdown(false); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Dropdown de resultados */}
          {showDropdown && search.length >= 1 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
              {filtered && filtered.length > 0 ? (
                <div className="py-2">
                  <p className="px-4 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
                  </p>
                  {filtered.map((p, idx) => {
                    const stockNum = Number(p.stock ?? 0);
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleAddFromDropdown(p.id)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                          isActive ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-blue-600">{formatPrice(p[priceField])}</p>
                          <p className="text-xs text-gray-400 line-through">{formatPrice(p.priceList)}</p>
                        </div>
                        <div className="shrink-0 ml-2">
                          {stockNum <= 0 ? (
                            <Badge className="bg-red-100 text-red-600 border-red-200 text-xs">Sin stock</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-600 border-blue-200 text-xs">Stock: {stockNum}</Badge>
                          )}
                        </div>
                        <div className="shrink-0 ml-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            stockNum <= 0
                              ? "bg-gray-100 text-gray-400"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}>
                            <Plus className="w-4 h-4" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No se encontraron productos</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Header y carrito */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" /> Catalogo
        </h1>
        <Button onClick={() => navigate("/pedido")} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
          <ShoppingCart className="w-4 h-4 mr-2" />
          {cartCount > 0 && <span className="bg-white text-blue-600 rounded-full px-1.5 py-0.5 text-xs font-bold mr-1.5">{cartCount}</span>}
          Ir al pedido
        </Button>
      </div>

      {(!products || products.length === 0) && (
        <div className="text-center py-16 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay productos disponibles</p>
        </div>
      )}

      {/* Productos por categoria */}
      {Object.entries(grouped).map(([cat, prods]) => (
        <div key={cat} className="mb-8">
          <h2 className="text-lg font-bold text-blue-600 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-600 rounded-full" />{cat}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prods?.map(p => {
              const stockNum = Number(p.stock ?? 0);
              const stockColor = stockNum <= 0 ? "text-red-500" : stockNum <= 5 ? "text-orange-500" : stockNum <= 10 ? "text-amber-500" : "text-green-600";
              return (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-sm text-gray-900 line-clamp-2 flex-1">{p.name}</p>
                    {stockNum <= 5 && stockNum > 0 && <Badge className="bg-orange-100 text-orange-600 border-orange-200 text-xs">Quedan {stockNum}</Badge>}
                    {stockNum <= 0 && <Badge className="bg-red-100 text-text-red-600 border-red-200 text-xs">Sin stock</Badge>}
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
