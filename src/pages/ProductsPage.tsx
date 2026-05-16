import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, ROLES } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Package,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const isAdmin = user?.role === ROLES.ADMIN || user?.role === ROLES.SUPERADMIN;
  const discountType = (user?.discountType ?? "efectivo") as "efectivo" | "transferencia";
  const priceField: "priceCash30" | "priceTransfer25" = discountType === "efectivo" ? "priceCash30" : "priceTransfer25";

  const { data: products, isLoading } = trpc.product.list.useQuery();
  const { data: cartItems } = trpc.cart.get.useQuery(undefined, {
    enabled: !isAdmin,
  });

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      utils.cart.get.invalidate();
    },
  });

  const cartCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  // Filter and group products by category
  const filtered = search
    ? products?.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const grouped: Record<string, NonNullable<typeof products>[number][]> = {};
  filtered?.forEach((p) => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });

  const handleQuantity = (productId: number, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] ?? 1) + delta),
    }));
  };

  const handleAddToCart = (productId: number) => {
    const qty = quantities[productId] ?? 1;
    addToCart.mutate({ productId, quantity: qty });
    setQuantities((prev) => ({ ...prev, [productId]: 1 }));
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Lista de Precios</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {products?.length ?? 0} productos en {Object.keys(grouped).length} categorias
            {!isAdmin && (
              <span className="ml-2">
                - Tu descuento: {" "}
                <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                  {discountType === "efectivo" ? "30% efectivo" : "25% transferencia"}
                </Badge>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
          {!isAdmin && (
            <Button
              onClick={() => navigate("/pedido")}
              className="bg-yellow-500 hover:bg-yellow-600 text-black relative"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Pedido
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 p-0 flex items-center justify-center">
                  {cartCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
        </div>
      )}

      {/* Products by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mb-8">
          <h2 className="text-lg font-semibold text-yellow-500 mb-3 flex items-center gap-2">
            <Package className="w-5 h-5" />
            {category}
            <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs">
              {(items ?? []).length} productos
            </Badge>
          </h2>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr,120px,120px,140px,80px] gap-4 px-4 py-3 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase">
              <span>Producto</span>
              <span className="text-right">Precio Lista</span>
              <span className="text-right text-yellow-500">
                {!isAdmin
                  ? discountType === "efectivo"
                    ? "Precio Efectivo"
                    : "Precio Transfer"
                  : "Precio Efectivo"}
              </span>
              <span className="text-center">Cantidad</span>
              <span></span>
            </div>

            {/* Products */}
            {(items ?? []).map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-1 md:grid-cols-[1fr,120px,120px,140px,80px] gap-2 md:gap-4 px-4 py-3 border-t border-zinc-800/50 items-center hover:bg-zinc-800/30 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-xs text-zinc-500 md:hidden">
                    Stock: {product.stock}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-zinc-500 line-through text-sm">
                    {formatPrice(product.priceList)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-yellow-500 font-semibold text-sm">
                    {formatPrice(
                      !isAdmin
                        ? product[priceField]
                        : product.priceCash30
                    )}
                  </span>
                  {isAdmin && (
                    <p className="text-xs text-zinc-500">
                      Transf: {formatPrice(product.priceTransfer25)}
                    </p>
                  )}
                </div>

                {!isAdmin ? (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleQuantity(product.id, -1)}
                        className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-medium text-sm">
                        {quantities[product.id] ?? 1}
                      </span>
                      <button
                        onClick={() => handleQuantity(product.id, 1)}
                        className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(product.id)}
                        disabled={addToCart.isPending}
                        className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black border border-yellow-500/30"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-right text-sm text-zinc-400">
                      Stock: {product.stock}
                    </div>
                    <div />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered?.length === 0 && !isLoading && (
        <div className="text-center py-20 text-zinc-500">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No se encontraron productos</p>
        </div>
      )}
    </div>
  );
}
