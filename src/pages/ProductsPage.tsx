import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search, Plus, Package, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const { data: products, isLoading } = trpc.product.list.useQuery();
  const { data: cart } = trpc.cart.get.useQuery();
  const addCart = trpc.cart.add.useMutation({ onSuccess: () => { utils.cart.get.invalidate(); utils.product.list.invalidate(); } });
  const discountType = user?.discountType ?? "efectivo";
  const priceField: "priceCash30" | "priceTransfer25" = discountType === "efectivo" ? "priceCash30" : "priceTransfer25";
  const cartCount = cart?.reduce((s, i) => s + i.cartItems.quantity, 0) ?? 0;

  const filtered = search ? products?.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.category ?? "").toLowerCase().includes(search.toLowerCase())) : products;
  const grouped: Record<string, typeof products> = {};
  filtered?.forEach(p => { const cat = p.category || "Sin categoria"; if (!grouped[cat]) grouped[cat] = []; grouped[cat]!.push(p); });

  const handleQty = (id: number, d: number) => setQtys(prev => ({ ...prev, [id]: Math.max(1, (prev[id] ?? 1) + d) }));
  const handleAdd = (pid: number) => { addCart.mutate({ productId: pid, quantity: qtys[pid] ?? 1 }); setQtys(p => ({ ...p, [pid]: 1 })); };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header con buscador */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <div className="flex-1 w-full md:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>
        <Button onClick={() => navigate("/pedido")} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
          <ShoppingCart className="w-4 h-4 mr-2" />{cartCount > 0 && <span className="ml-1">({cartCount})</span>} Ir al pedido
        </Button>
      </div>

      {(!filtered || filtered.length === 0) && (
        <div className="text-center py-16 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{search ? "No se encontraron productos" : "No hay productos"}</p>
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
