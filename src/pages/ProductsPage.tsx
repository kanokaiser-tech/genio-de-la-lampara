import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search, Plus, Minus, Package, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";

export default function ProductsPage() {
  const { user, isAdmin } = useAuth();
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

  const filtered = search ? products?.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())) : products;
  const grouped: Record<string, typeof products> = {};
  filtered?.forEach(p => { if (!grouped[p.category]) grouped[p.category] = []; grouped[p.category]!.push(p); });

  const handleQty = (id: number, d: number) => setQtys(prev => ({ ...prev, [id]: Math.max(1, (prev[id] ?? 1) + d) }));
  const handleAdd = (pid: number) => { addCart.mutate({ productId: pid, quantity: qtys[pid] ?? 1 }); setQtys(p => ({ ...p, [pid]: 1 })); };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Lista de Precios</h1>
          <p className="text-zinc-400 text-sm mt-1">{products?.length ?? 0} productos {!isAdmin && <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 ml-2">{discountType === "efectivo" ? "30% efectivo" : "25% transferencia"}</Badge>}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-zinc-900 border-zinc-700 text-white" /></div>
          {!isAdmin && <Button onClick={() => navigate("/pedido")} className="bg-yellow-500 hover:bg-yellow-600 text-black relative"><ShoppingCart className="w-4 h-4 mr-2" /> Pedido {cartCount > 0 && <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 p-0 flex items-center justify-center">{cartCount}</Badge>}</Button>}
        </div>
      </div>
      {isLoading && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-yellow-500 animate-spin" /></div>}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="mb-8">
          <h2 className="text-lg font-semibold text-yellow-500 mb-3 flex items-center gap-2"><Package className="w-5 h-5" /> {cat} <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs">{(items ?? []).length} productos</Badge></h2>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr,120px,120px,140px,80px] gap-4 px-4 py-3 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase">
              <span>Producto</span><span className="text-right">Precio Lista</span><span className="text-right text-yellow-500">{!isAdmin ? (discountType === "efectivo" ? "Precio Efectivo" : "Precio Transfer") : "Precio Efectivo"}</span><span className="text-center">Cantidad</span><span></span>
            </div>
            {(items ?? []).map(p => (
              <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1fr,120px,120px,140px,80px] gap-2 md:gap-4 px-4 py-3 border-t border-zinc-800/50 items-center hover:bg-zinc-800/30">
                <div><p className="font-medium text-sm">{p.name}</p><p className="text-xs text-zinc-500 md:hidden">Stock: {p.stock}</p></div>
                <div className="text-right"><span className="text-zinc-500 line-through text-sm">{formatPrice(p.priceList)}</span></div>
                <div className="text-right"><span className="text-yellow-500 font-semibold text-sm">{formatPrice(!isAdmin ? p[priceField] : p.priceCash30)}</span>{isAdmin && <p className="text-xs text-zinc-500">Transf: {formatPrice(p.priceTransfer25)}</p>}</div>
                {!isAdmin ? (<>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleQty(p.id, -1)} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700"><Minus className="w-3 h-3" /></button>
                    <span className="w-8 text-center font-medium text-sm">{qtys[p.id] ?? 1}</span>
                    <button onClick={() => handleQty(p.id, 1)} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700"><Plus className="w-3 h-3" /></button>
                  </div>
                  <div className="flex justify-end"><Button size="sm" onClick={() => handleAdd(p.id)} disabled={addCart.isPending} className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black border border-yellow-500/30"><Plus className="w-3 h-3" /></Button></div>
                </>) : (<><div className="text-right text-sm text-zinc-400">Stock: {p.stock}</div><div /></>)}
              </div>
            ))}
          </div>
        </div>
      ))}
      {!isLoading && (!filtered || filtered.length === 0) && <div className="text-center py-20 text-zinc-500"><Package className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No se encontraron productos</p></div>}
    </div>
  );
}
