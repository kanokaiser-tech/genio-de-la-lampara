import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Package, Users, RefreshCw, Settings, ClipboardList, Trash2, Plus, Save, Lock, Pencil, X, Check, Shield, TrendingUp, Calendar, ImageOff, Coins, Clock, MapPin, User, History, ShoppingCart, Search, Star, GripVertical } from "lucide-react";

export default function AdminPage() {
  const { isSuperadmin } = useAuth();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState("products");
  const [expanded, setExpanded] = useState<number | null>(null);

  // New forms
  const [newProd, setNewProd] = useState({ name: "", category: "", priceList: "", stock: "0" });
  const [newRev, setNewRev] = useState({ name: "", email: "", phone: "", password: "", discountType: "efectivo" as "efectivo" | "transferencia", parentId: "" });
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", phone: "", password: "" });
  const [newSuperadmin, setNewSuperadmin] = useState({ name: "", email: "", phone: "", password: "" });

  // Edit form
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", parentId: "" });

  // Password change dialog
  const [passDialogOpen, setPassDialogOpen] = useState(false);
  const [changePassUser, setChangePassUser] = useState<{ id: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Asignar monedas de oro
  const [coinAssign, setCoinAssign] = useState({ userId: "", amount: "", description: "" });

  // Data
  const { data: products, isLoading: lp } = trpc.product.list.useQuery();
  const { data: allUsers, isLoading: lr } = trpc.user.list.useQuery();
  const { data: admins } = trpc.user.listAdmins.useQuery();
  const { data: superadmins } = trpc.user.byRole.useQuery({ role: "superadmin" }, { enabled: isSuperadmin });
  const revs = allUsers?.filter(u => u.role === "revendedor") ?? [];
  const { data: orders, isLoading: lo } = trpc.order.myOrdersAsAdmin.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();
  const { data: salesByAdmin, isLoading: ls } = trpc.order.salesByAdmin.useQuery(undefined, { enabled: isSuperadmin });
  const { data: featuredProducts, refetch: refetchFeatured } = trpc.product.featured.useQuery();

  // Ofertas - selects desplegables
  const [dealRows, setDealRows] = useState<{ productId: string; dealPrice: string }[]>([{ productId: "", dealPrice: "" }]);

  // Mutations
  const cProd = trpc.product.create.useMutation({ onSuccess: () => { utils.product.list.invalidate(); setNewProd({ name: "", category: "", priceList: "", stock: "0" }); } });
  const dProd = trpc.product.delete.useMutation({ onSuccess: () => utils.product.list.invalidate() });
  const clProd = trpc.product.clearAll.useMutation({ onSuccess: () => utils.product.list.invalidate() });
  const delTnProd = trpc.tiendanube.deleteProduct.useMutation({ onSuccess: () => utils.product.list.invalidate() });
  const cRev = trpc.user.createRevendedor.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      utils.user.listAdmins.invalidate();
      setNewRev({ name: "", email: "", phone: "", password: "", discountType: "efectivo", parentId: "" });
    }
  });
  const upCat = trpc.product.updateCategory.useMutation({ onSuccess: () => utils.product.list.invalidate() });
  const updateLocation = trpc.product.updateLocation.useMutation({
    onSuccess: () => utils.product.list.invalidate(),
  });
  const cAdmin = trpc.user.createAdmin.useMutation({ onSuccess: () => { utils.user.listAdmins.invalidate(); setNewAdmin({ name: "", email: "", phone: "", password: "" }); } });
  const cSuperadmin = trpc.user.createSuperadmin.useMutation({
    onSuccess: () => {
      utils.user.byRole.invalidate();
      utils.user.list.invalidate();
      setNewSuperadmin({ name: "", email: "", phone: "", password: "" });
    }
  });
  const dUser = trpc.user.delete.useMutation({ onSuccess: () => { utils.user.list.invalidate(); utils.user.listAdmins.invalidate(); utils.user.byRole.invalidate(); } });
  const chPass = trpc.user.changePassword.useMutation({ onSuccess: () => closePassDialog() });
  const upUser = trpc.user.update.useMutation({ onSuccess: () => { utils.user.list.invalidate(); utils.user.listAdmins.invalidate(); utils.user.byRole.invalidate(); setEditing(null); } });
  const upSet = trpc.settings.update.useMutation({ onSuccess: () => utils.settings.get.invalidate() });
  const addDeal = trpc.product.addDeal.useMutation({ onSuccess: () => { utils.product.featured.invalidate(); setDealRows([{ productId: "", dealPrice: "" }]); } });
  const removeDeal = trpc.product.removeDeal.useMutation({ onSuccess: () => utils.product.featured.invalidate() });
  const updateDealPrice = trpc.product.updateDealPrice.useMutation({ onSuccess: () => utils.product.featured.invalidate() });
  const sync = trpc.tiendanube.sync.useMutation({ onSuccess: () => utils.product.list.invalidate() });
  const test = trpc.tiendanube.test.useMutation();
  const appr = trpc.order.approve.useMutation({ onSuccess: () => utils.order.myOrdersAsAdmin.invalidate() });
  const rej = trpc.order.reject.useMutation({ onSuccess: () => utils.order.myOrdersAsAdmin.invalidate() });
  const chPay = trpc.order.updatePaymentType.useMutation({
    onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); utils.order.detail.invalidate(); },
  });
  const togglePaid = trpc.order.togglePaid.useMutation({
    onSuccess: () => { utils.order.dailyOrders.invalidate(); utils.order.myOrdersAsAdmin.invalidate(); },
  });
  const closeDaily = trpc.order.closeDaily.useMutation({
    onSuccess: () => { utils.order.dailyOrders.invalidate(); utils.order.closureHistory.invalidate(); utils.order.myOrdersAsAdmin.invalidate(); },
  });
  const { data: closureHistory } = trpc.order.closureHistory.useQuery();
  const clearHistory = trpc.order.clearHistory.useMutation({
    onSuccess: () => {
      utils.order.salesByAdmin.invalidate();
      utils.order.myOrdersAsAdmin.invalidate();
    },
  });
  const { data: coinStats } = trpc.goldCoins.stats.useQuery(undefined, { enabled: isSuperadmin });
  const expireCoins = trpc.goldCoins.expireMonthly.useMutation({
    onSuccess: () => utils.goldCoins.stats.invalidate(),
  });
  const adminAddCoins = trpc.goldCoins.adminAddCoins.useMutation({
    onSuccess: () => {
      utils.goldCoins.stats.invalidate();
      setCoinAssign({ userId: "", amount: "", description: "" });
    },
  });
  // Buscadores
  const [searchRevs, setSearchRevs] = useState("");
  const [searchAdmins, setSearchAdmins] = useState("");

  // Admin editar pedido
  const [editingOrder, setEditingOrder] = useState<number | null>(null);
  const [addProductId, setAddProductId] = useState("");
  const [addQty, setAddQty] = useState("1");
  const { data: orderDetail } = trpc.order.detail.useQuery(
    { id: editingOrder! },
    { enabled: editingOrder !== null }
  );
  const upItem = trpc.order.updateItem.useMutation({
    onSuccess: () => { utils.order.detail.invalidate(); utils.order.myOrdersAsAdmin.invalidate(); },
  });
  const rmItem = trpc.order.removeItem.useMutation({
    onSuccess: () => { utils.order.detail.invalidate(); utils.order.myOrdersAsAdmin.invalidate(); },
  });
  const addItem = trpc.order.addItem.useMutation({
    onSuccess: () => { utils.order.detail.invalidate(); utils.order.myOrdersAsAdmin.invalidate(); setAddProductId(""); setAddQty("1"); },
  });

  const fmt = (d: Date | string) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // Query: pedidos del dia + pendientes
  const { data: dailyOrders, isLoading: ld } = trpc.order.dailyOrders.useQuery();

  // Admin: carritos de revendedores
  const { data: adminCarts, isLoading: lc } = trpc.cart.adminList.useQuery();
  const adminCartUpdate = trpc.cart.adminUpdate.useMutation({
    onSuccess: () => utils.cart.adminList.invalidate(),
  });
  const adminCartRemove = trpc.cart.adminRemove.useMutation({
    onSuccess: () => utils.cart.adminList.invalidate(),
  });
  const adminCartAdd = trpc.cart.adminAdd.useMutation({
    onSuccess: () => { utils.cart.adminList.invalidate(); setCartAddProductId(""); setCartAddQty("1"); },
  });
  const [cartAddProductId, setCartAddProductId] = useState("");
  const [cartAddQty, setCartAddQty] = useState("1");
  const [expandedCart, setExpandedCart] = useState<number | null>(null);

  const startEdit = (user: any) => { setEditing(user.id); setEditForm({ name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "", parentId: user.parentId ? String(user.parentId) : "" }); };
  const openPassDialog = (user: any) => { setChangePassUser({ id: user.id, name: user.name }); setNewPassword(""); setPassDialogOpen(true); };
  const closePassDialog = () => { setPassDialogOpen(false); setChangePassUser(null); setNewPassword(""); };

  // Tabs disponibles segun rol
  const cartCount = adminCarts?.reduce((s, c) => s + c.items.length, 0) ?? 0;
  const tabs = [
    { value: "products", label: `Productos (${products?.length ?? 0})`, icon: Package },
    { value: "featured", label: `Ofertas (${featuredProducts?.length ?? 0})`, icon: Star },
    { value: "revendedores", label: `Revendedores (${revs?.length ?? 0})`, icon: Users },
    { value: "carts", label: `Carritos (${cartCount})`, icon: ShoppingCart },
    ...(isSuperadmin ? [{ value: "admins", label: `Admins (${admins?.length ?? 0})`, icon: Users }] : []),
    { value: "orders", label: `Caja (${dailyOrders?.length ?? 0})`, icon: ClipboardList },
    { value: "history", label: `Historial`, icon: Calendar },
    ...(isSuperadmin ? [{ value: "import", label: "Importar", icon: RefreshCw }] : []),
    ...(isSuperadmin ? [{ value: "settings", label: "Config", icon: Settings }] : []),
    ...(isSuperadmin ? [{ value: "superadmins", label: `SuperAdmins (${superadmins?.length ?? 0})`, icon: Shield }] : []),
    ...(isSuperadmin ? [{ value: "sales", label: "Ventas", icon: TrendingUp }] : []),
    ...(isSuperadmin ? [{ value: "coins", label: "Monedas", icon: Coins }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Administracion</h1>
        {isSuperadmin && <Badge className="bg-blue-100 text-blue-700 border-blue-300 font-bold">SUPERADMIN</Badge>}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white border border-gray-200 mb-6 w-full overflow-x-auto flex-nowrap h-auto py-1 px-1 scrollbar-hide">
          {tabs.map(t => (
            <TabsTrigger 
              key={t.value} 
              value={t.value} 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 flex-shrink-0 px-2 py-1.5 text-xs whitespace-nowrap"
            >
              <t.icon className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* PRODUCTS */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center"><p className="text-sm text-gray-500">{products?.length ?? 0} productos</p><Button variant="outline" size="sm" onClick={() => clProd.mutate()} className="border-red-300 text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3 mr-1" /> Vaciar todo</Button></div>
          {lp ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div> : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="hidden md:grid grid-cols-[48px,1fr,160px,80px,110px,110px,110px,100px] gap-3 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase items-center">
                <span></span><span>Nombre</span><span>Categoria</span><span className="text-center">Stock</span><span className="text-right">Lista</span><span className="text-right">Efectivo</span><span className="text-right">Transfer</span><span className="text-center">Acciones</span>
              </div>
              {products?.map(p => {
                const stockNum = Number(p.stock ?? 0);
                const stockColor = stockNum <= 0 ? "text-red-500" : stockNum <= 5 ? "text-orange-500" : stockNum <= 10 ? "text-amber-500" : "text-green-600";
                // Categorias unicas para el select
                const allCategories = [...new Set(products.map(pr => pr.category).filter(Boolean))];
                return (
                  <div key={p.id} className="grid grid-cols-[48px,1fr,160px,80px,110px,110px,110px,100px] gap-3 px-4 py-3 border-t border-gray-100 items-center text-sm">
                    {/* Miniatura */}
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <ImageOff className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <span className="truncate text-gray-900">{p.name}</span>
                    <select
                      value={p.category ?? ""}
                      onChange={e => upCat.mutate({ id: p.id, category: e.target.value })}
                      className="bg-gray-50 border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full"
                    >
                      <option value={p.category ?? ""}>{p.category ?? "Sin categoria"}</option>
                      {allCategories.filter(c => c !== p.category).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <span className={`text-center font-bold ${stockColor}`}>{stockNum}</span>
                    <div className="flex items-center gap-1">
  <select
    value={p.location?.startsWith("Caja-") ? "box" : "shelf"}
    onChange={(e) => {
      if (e.target.value === "shelf") updateLocation.mutate({ id: p.id, location: "A1" });
      else updateLocation.mutate({ id: p.id, location: "Caja-1" });
    }}
    className="h-8 text-xs bg-gray-50 border border-gray-300 rounded px-1"
  >
    <option value="shelf">📦 Estante</option>
    <option value="box">📦 Caja</option>
  </select>
  
  {!p.location?.startsWith("Caja-") ? (
    <>
      <select
        value={(p.location || "A1").match(/^([A-J])/)?.[1] || "A"}
        onChange={(e) => updateLocation.mutate({ id: p.id, location: e.target.value + (p.location?.slice(-1) || "1") })}
        className="w-12 h-8 text-center bg-gray-50 border border-gray-300 rounded"
      >
        {["A","B","C","D","E","F","G","H","I","J"].map(l => <option key={l} value={l}>{l}</option>)}
      </select>
      <select
        value={parseInt((p.location || "A1").match(/([1-5])$/)?.[1] || "1")}
        onChange={(e) => updateLocation.mutate({ id: p.id, location: (p.location?.charAt(0) || "A") + e.target.value })}
        className="w-12 h-8 text-center bg-gray-50 border border-gray-300 rounded"
      >
        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </>
  ) : (
    <select
      value={parseInt((p.location || "Caja-1").replace("Caja-", ""))}
      onChange={(e) => updateLocation.mutate({ id: p.id, location: "Caja-" + e.target.value })}
      className="w-16 h-8 text-center bg-gray-50 border border-gray-300 rounded"
    >
      {[...Array(20)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
    </select>
  )}
  <span className="text-xs font-mono bg-gray-100 px-1 rounded">{p.location || "A1"}</span>
</div>
                    <span className="text-right text-gray-400 line-through">{formatPrice(p.priceList)}</span>
                    <span className="text-right text-blue-600 font-medium">{formatPrice(p.priceCash30)}</span>
                    <span className="text-right text-green-600">{formatPrice(p.priceTransfer25)}</span>
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => {
                          if (p.isFeatured) removeFeatured.mutate({ id: p.id });
                          else setFeatured.mutate({ id: p.id });
                        }}
                        className={p.isFeatured ? "text-yellow-500 hover:text-gray-400" : "text-gray-300 hover:text-yellow-500"}
                        title={p.isFeatured ? "Quitar de ofertas" : "Agregar a ofertas"}
                      >
                        <Star className={`w-4 h-4 ${p.isFeatured ? "fill-yellow-400" : ""}`} />
                      </button>
                      {p.tiendanubeId && (
                        <button onClick={() => { if (confirm('Eliminar de Tiendanube tambien?')) delTnProd.mutate({ productId: p.id }); }} className="text-gray-400 hover:text-red-500" title="Eliminar de Tiendanube"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => dProd.mutate({ id: p.id })} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* OFERTAS DE LA SEMANA */}
        <TabsContent value="featured" className="space-y-4">
          {/* Formulario para agregar ofertas */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" /> Configurar ofertas
            </h3>

            {dealRows.map((row, idx) => (
              <div key={idx} className="flex flex-wrap gap-2 items-end mb-2">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-gray-500 mb-1 block">Producto</label>
                  <select
                    value={row.productId}
                    onChange={e => {
                      const newRows = [...dealRows];
                      newRows[idx].productId = e.target.value;
                      setDealRows(newRows);
                    }}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="">Seleccionar producto...</option>
                    {products?.filter((p: any) => !featuredProducts?.some((f: any) => f.id === p.id) || String(p.id) === row.productId).sort((a: any, b: any) => a.name.localeCompare(b.name)).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} (Lista: ${Number(p.priceList).toLocaleString()})</option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="text-xs text-gray-500 mb-1 block">Precio oferta</label>
                  <input
                    type="number"
                    value={row.dealPrice}
                    onChange={e => {
                      const newRows = [...dealRows];
                      newRows[idx].dealPrice = e.target.value;
                      setDealRows(newRows);
                    }}
                    placeholder="35000"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 font-bold"
                  />
                </div>
                {idx === dealRows.length - 1 ? (
                  <button
                    onClick={() => {
                      if (row.productId && row.dealPrice) {
                        addDeal.mutate({
                          productId: Number(row.productId),
                          dealPrice: parseFloat(row.dealPrice),
                        });
                      }
                    }}
                    disabled={!row.productId || !row.dealPrice || addDeal.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addDeal.isPending ? "..." : "Agregar"}
                  </button>
                ) : (
                  <button
                    onClick={() => setDealRows(dealRows.filter((_, i) => i !== idx))}
                    className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => setDealRows([...dealRows, { productId: "", dealPrice: "" }])}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Agregar otra oferta
            </button>
          </div>

          {/* Lista de ofertas activas */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{featuredProducts?.length ?? 0} ofertas activas</p>
          </div>
          {!featuredProducts || featuredProducts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-xl">
              No hay ofertas configuradas. Usa el formulario de arriba para agregar.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="hidden md:grid grid-cols-[48px,1fr,120px,100px,100px,80px,60px] gap-3 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase items-center">
                <span></span><span>Producto</span><span>Categoria</span><span className="text-right">Precio normal</span><span className="text-right text-red-500">Precio oferta</span><span className="text-center">Tipo</span><span></span>
              </div>
              {featuredProducts.map((p: any) => (
                <div key={p.id} className="grid grid-cols-[48px,1fr,120px,100px,100px,80px,60px] gap-3 px-4 py-3 border-t border-gray-100 items-center text-sm">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" /> : <ImageOff className="w-4 h-4 text-gray-300" />}
                  </div>
                  <span className="truncate text-gray-900 font-medium">{p.name}</span>
                  <span className="text-xs text-gray-500">{p.category}</span>
                  <span className="text-right text-xs text-gray-400 line-through">
                    {formatPrice(Number(p.dealType === "transfer" ? p.priceTransfer25 : p.priceCash30))}
                  </span>
                  <span className="text-right font-bold text-red-600 text-base">
                    {formatPrice(Number(p.dealPrice))}
                  </span>
                  <span className="text-center text-xs text-gray-500">
                    {p.dealType === "transfer" ? "Transf." : "Efectivo"}
                  </span>
                  <button
                    onClick={() => { if (confirm("Quitar esta oferta?")) removeDeal.mutate({ productId: p.id }); }}
                    className="text-red-400 hover:text-red-600 p-1"
                    title="Eliminar oferta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* REVENDEDORES */}
        <TabsContent value="revendedores" className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold mb-3 text-gray-900">Nuevo revendedor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                <Input placeholder="Nombre completo" value={newRev.name} onChange={e => setNewRev({ ...newRev, name: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <Input placeholder="Email" type="email" value={newRev.email} onChange={e => setNewRev({ ...newRev, email: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Telefono</label>
                <Input placeholder="Telefono" value={newRev.phone} onChange={e => setNewRev({ ...newRev, phone: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Contrasena</label>
                <Input placeholder="Contrasena" type="password" value={newRev.password} onChange={e => setNewRev({ ...newRev, password: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo de descuento</label>
                <select value={newRev.discountType} onChange={e => setNewRev({ ...newRev, discountType: e.target.value as "efectivo" | "transferencia" })} className="w-full h-9 bg-gray-50 border border-gray-300 rounded-lg px-3 text-sm text-gray-900">
                  <option value="efectivo">Efectivo -30%</option>
                  <option value="transferencia">Transferencia -25%</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-blue-600 mb-1 block font-medium">Administrador asignado</label>
                <select value={newRev.parentId} onChange={e => setNewRev({ ...newRev, parentId: e.target.value })} className="w-full h-9 bg-gray-50 border border-blue-300 rounded-lg px-3 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500">
                  <option value="">-- Seleccionar administrador --</option>
                  {admins?.map(a => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
                </select>
                {!newRev.parentId && <p className="text-xs text-gray-400 mt-1">Si no seleccionas, se asigna a vos automaticamente.</p>}
              </div>
              <div className="flex items-end">
                <Button onClick={() => cRev.mutate({ ...newRev, parentId: newRev.parentId ? Number(newRev.parentId) : undefined })} disabled={!newRev.name || !newRev.email || !newRev.password} className="w-full bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-1" /> Crear revendedor</Button>
              </div>
            </div>
          </div>
          {/* Buscador de revendedores */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar revendedor..."
              value={searchRevs}
              onChange={e => setSearchRevs(e.target.value)}
              className="pl-9 bg-white border-gray-300 text-gray-900"
            />
          </div>

          {lr ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" /> : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-[1fr,180px,100px,80px,120px,60px,60px,60px] gap-3 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase items-center">
                <span>Nombre</span><span>Email</span><span>Telefono</span><span>Desc.</span><span>Admin asignado</span><span></span><span></span><span></span>
              </div>
              {revs?.filter(r => {
                const q = searchRevs.toLowerCase();
                return !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.phone ?? "").includes(q);
              }).map(r => {
                const assignedAdmin = admins?.find(a => a.id === r.parentId);
                return (
                  <div key={r.id} className="grid grid-cols-[1fr,180px,100px,80px,120px,60px,60px,60px] gap-3 px-4 py-3 border-t border-gray-100 items-center text-sm">
                    {editing === r.id ? (
                      <>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-gray-500">Nombre</label>
                          <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-gray-500">Email</label>
                          <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-gray-500">Telefono</label>
                          <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                        </div>
                        <div />
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-blue-600 font-medium">Cambiar admin</label>
                          <select value={editForm.parentId} onChange={e => setEditForm({ ...editForm, parentId: e.target.value })} className="bg-gray-50 border border-blue-300 rounded-lg px-2 text-sm text-gray-900 h-8 w-full focus:ring-1 focus:ring-blue-500">
                            {admins?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-1 pt-4">
                          <Button size="sm" onClick={() => upUser.mutate({ id: r.id, name: editForm.name, email: editForm.email, phone: editForm.phone, parentId: editForm.parentId ? Number(editForm.parentId) : null })} className="bg-green-600 hover:bg-green-700 h-8 px-2" title="Guardar"><Check className="w-3 h-3 text-white" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-8 px-2 text-gray-500"><X className="w-3 h-3" /></Button>
                        </div>
                        <div />
                      </>
                    ) : (
                      <>
                        <span className="truncate text-gray-900">{r.name}</span>
                        <span className="text-gray-500 truncate">{r.email}</span>
                        <span className="text-gray-500">{r.phone || "-"}</span>
                        <Badge variant="outline" className="text-blue-600 border-blue-300 w-fit text-xs">{r.discountType === "efectivo" ? "30%" : "25%"}</Badge>
                        <span className="text-gray-600 text-xs truncate" title={assignedAdmin?.email}>{assignedAdmin?.name || <span className="text-gray-400">Sin asignar</span>}</span>
                        <button onClick={() => startEdit(r)} className="text-gray-400 hover:text-blue-600 flex justify-center"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => openPassDialog(r)} className="text-gray-400 hover:text-blue-600 flex justify-center"><Lock className="w-4 h-4" /></button>
                        <button onClick={() => dUser.mutate({ id: r.id })} className="text-gray-400 hover:text-red-500 flex justify-center"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                );
              })}
              {(!revs || revs.length === 0) && <div className="text-center py-8 text-gray-500 text-sm">No hay revendedores</div>}
            </div>
          )}
        </TabsContent>

        {/* CARRITOS — Carritos de revendedores */}
        <TabsContent value="carts" className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Carritos de Revendedores</h2>
              <p className="text-xs text-gray-500">Aqui podes ver y modificar los carritos que los revendedores estan armando</p>
            </div>
          </div>

          {lc ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div> : (!adminCarts || adminCarts.length === 0) ? (
            <div className="text-center py-20 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay carritos activos</p>
              <p className="text-xs text-gray-400 mt-1">Los revendedores no tienen productos en sus carritos</p>
            </div>
          ) : (
            adminCarts.map((cart: any) => {
              const isExpanded = expandedCart === cart.revendedor.id;
              const cartTotal = cart.items.reduce((sum: number, item: any) => {
                const price = Number(item.product?.priceCash30 ?? 0);
                return sum + price * item.quantity;
              }, 0);
              return (
                <div key={cart.revendedor.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <button onClick={() => setExpandedCart(isExpanded ? null : cart.revendedor.id)} className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                      <div className="text-left">
                        <p className="font-medium text-sm text-gray-900">{cart.revendedor.name}</p>
                        <p className="text-xs text-gray-500">{cart.revendedor.email} {cart.revendedor.phone && `- ${cart.revendedor.phone}`}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">{cart.items.length} productos</Badge>
                    </div>
                    <span className="font-bold text-blue-600">{formatPrice(cartTotal)}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
                      {/* Items del carrito */}
                      {cart.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2 text-sm">
                          <span className="flex-1 text-gray-900 truncate">{item.product?.name ?? "Producto desconocido"}</span>
                          <span className="text-blue-600 font-medium w-20 text-right shrink-0">{formatPrice(item.product?.priceCash30 ?? 0)}</span>
                          {/* Controles de cantidad */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { if (item.quantity > 1) adminCartUpdate.mutate({ userId: cart.revendedor.id, productId: item.productId, quantity: item.quantity - 1 }); }}
                              className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold"
                            >-</button>
                            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                            <button
                              onClick={() => { adminCartUpdate.mutate({ userId: cart.revendedor.id, productId: item.productId, quantity: item.quantity + 1 }); }}
                              className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold"
                            >+</button>
                          </div>
                          {/* Eliminar */}
                          <button
                            onClick={() => { if (confirm(`Eliminar ${item.product?.name}?`)) adminCartRemove.mutate({ userId: cart.revendedor.id, productId: item.productId }); }}
                            className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Agregar producto */}
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-sm border border-dashed border-gray-300 mt-2">
                        <select
                          value={cartAddProductId}
                          onChange={e => setCartAddProductId(e.target.value)}
                          className="flex-1 bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Agregar producto...</option>
                          {products?.filter(p => Number(p.stock ?? 0) > 0).map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.stock} disp.)</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { if (Number(cartAddQty) > 1) setCartAddQty(String(Number(cartAddQty) - 1)); }} className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold">-</button>
                          <span className="w-8 text-center font-medium text-sm">{cartAddQty}</span>
                          <button onClick={() => setCartAddQty(String(Number(cartAddQty) + 1))} className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold">+</button>
                        </div>
                        <button
                          onClick={() => { if (cartAddProductId) adminCartAdd.mutate({ userId: cart.revendedor.id, productId: Number(cartAddProductId), quantity: Number(cartAddQty) }); }}
                          disabled={!cartAddProductId || adminCartAdd.isPending}
                          className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          {adminCartAdd.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* ADMINS — solo superadmin */}
        {isSuperadmin && (
          <TabsContent value="admins" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3 text-gray-900">Nuevo admin</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <Input placeholder="Nombre" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Input placeholder="Email" type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Input placeholder="Telefono (WhatsApp)" value={newAdmin.phone} onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Input placeholder="Contrasena" type="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Button onClick={() => cAdmin.mutate(newAdmin)} disabled={!newAdmin.name || !newAdmin.email || !newAdmin.password} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-1" /> Crear</Button>
              </div>
            </div>
            {/* Buscador de admins */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar admin..."
                value={searchAdmins}
                onChange={e => setSearchAdmins(e.target.value)}
                className="pl-9 bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-[1fr,200px,120px,80px,80px,80px] gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase items-center">
                <span>Nombre</span><span>Email</span><span>Telefono</span><span></span><span></span><span></span>
              </div>
              {admins?.filter(a => {
                const q = searchAdmins.toLowerCase();
                return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
              }).map(a => (
                <div key={a.id} className="grid grid-cols-[1fr,200px,120px,80px,80px,80px] gap-4 px-4 py-3 border-t border-gray-100 items-center text-sm">
                  {editing === a.id ? (
                    <>
                      <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                      <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                      <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                      <Button size="sm" onClick={() => upUser.mutate({ id: a.id, name: editForm.name, email: editForm.email, phone: editForm.phone })} className="bg-green-600 hover:bg-green-700 h-8 px-2"><Check className="w-3 h-3 text-white" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-8 px-2 text-gray-500"><X className="w-3 h-3" /></Button>
                      <div />
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-gray-900">{a.name}</span>
                      <span className="text-gray-500">{a.email}</span>
                      <span className="text-gray-500">{a.phone || "-"}</span>
                      <button onClick={() => startEdit(a)} className="text-gray-400 hover:text-blue-600 flex justify-center"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => openPassDialog(a)} className="text-gray-400 hover:text-blue-600 flex justify-center"><Lock className="w-4 h-4" /></button>
                      <button onClick={() => dUser.mutate({ id: a.id })} className="text-gray-400 hover:text-red-500 flex justify-center"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              ))}
              {(!admins || admins.length === 0) && <div className="text-center py-8 text-gray-500 text-sm">No hay otros admins</div>}
            </div>
          </TabsContent>
        )}

        {/* ORDERS — Cierre de caja */}
        <TabsContent value="orders" className="space-y-4">
          {/* ========== PENDING ORDERS (para aprobar/editar) ========== */}
          {lo ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-amber-500 animate-spin" /></div>
          ) : orders && orders.filter((o: any) => o.status === "pending").length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-gray-900">Pedidos Pendientes</h2>
                <Badge className="bg-amber-100 text-amber-700 border-amber-300">{orders.filter((o: any) => o.status === "pending").length}</Badge>
              </div>
              <p className="text-xs text-gray-500 mb-2">Estos pedidos estan esperando aprobacion. Podes editarlos antes de aprobar.</p>
              {orders.filter((o: any) => o.status === "pending").map(o => {
                const isEditing = editingOrder === o.id;
                return (
                  <div key={o.id} className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
                    <button onClick={() => setEditingOrder(isEditing ? null : o.id)} className="w-full px-4 py-4 flex items-center justify-between hover:bg-amber-50/50">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">Pendiente</Badge>
                        <div className="text-left">
                          <p className="font-medium text-sm text-gray-900 flex items-center gap-2">
                            Pedido #{o.id}
                            <span className="text-xs text-gray-400 font-normal">{(o as any).revendedorName ?? "-"}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            {fmt(o.createdAt)} - {o.paymentType} {o.shippingType !== "none" && ` - ${o.shippingType === "express" ? "Express" : "Gratis"}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-blue-600">{formatPrice(o.totalAmount)}</span>
                        <Button
                          size="sm"
                          onClick={e => { e.stopPropagation(); appr.mutate({ id: o.id }); }}
                          disabled={appr.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {appr.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                          Aprobar
                        </Button>
                      </div>
                    </button>
                    {isEditing && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                        {/* Info revendedor */}
                        {(() => {
                          const rev = allUsers?.find(u => u.id === o.userId);
                          return rev && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3 flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-600" />
                              <p className="text-sm text-blue-800"><strong>{rev.name}</strong> ({rev.email}) {rev.phone && `- ${rev.phone}`}</p>
                            </div>
                          );
                        })()}
                        {o.notes && <p className="text-sm text-gray-500 mb-3 bg-gray-50 p-2 rounded flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {o.notes}</p>}

                        {/* Editable items */}
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Productos (editables)</h4>
                        <div className="space-y-2 mb-4">
                          {orderDetail?.items && orderDetail.items.length > 0 ? orderDetail.items.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2 text-sm">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-gray-900 truncate">{item.productName}</span>
                                <span className="text-xs text-blue-600 font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200">
                                  📍 {products?.find(p => p.name === item.productName)?.location || "Sin ubicación"}
                                </span>
                              </div>
                              <span className="text-blue-600 font-medium w-20 text-right shrink-0">{formatPrice(item.price)}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); if (item.quantity > 1) upItem.mutate({ orderId: o.id, itemId: item.id, quantity: item.quantity - 1 }); }} className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold">-</button>
                                <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                                <button onClick={(e) => { e.stopPropagation(); upItem.mutate({ orderId: o.id, itemId: item.id, quantity: item.quantity + 1 }); }} className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold">+</button>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); if (confirm(`Eliminar ${item.productName}?`)) rmItem.mutate({ orderId: o.id, itemId: item.id }); }} className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )) : <p className="text-sm text-gray-400">No hay productos</p>}

                          {/* Add product */}
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-sm border border-dashed border-gray-300 mt-2">
                            <select value={addProductId} onChange={e => setAddProductId(e.target.value)} className="flex-1 bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                              <option value="">Agregar producto...</option>
                              {products?.filter(p => Number(p.stock ?? 0) > 0).map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.stock} disp.)</option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); if (Number(addQty) > 1) setAddQty(String(Number(addQty) - 1)); }} className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold">-</button>
                              <span className="w-8 text-center font-medium text-sm">{addQty}</span>
                              <button onClick={(e) => { e.stopPropagation(); setAddQty(String(Number(addQty) + 1)); }} className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold">+</button>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); if (addProductId) { addItem.mutate({ orderId: o.id, productId: Number(addProductId), quantity: Number(addQty) }); } }} disabled={!addProductId || addItem.isPending} className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                              {addItem.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Payment type toggle */}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs text-gray-500">Metodo de pago:</span>
                            <button onClick={(e) => { e.stopPropagation(); chPay.mutate({ orderId: o.id, paymentType: o.paymentType === "efectivo" ? "transferencia" : "efectivo" }); }} className={`px-2 py-1 rounded text-xs font-bold border ${o.paymentType === "efectivo" ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-green-100 text-green-700 border-green-300"}`}>
                              {o.paymentType === "efectivo" ? "Efectivo (-30%)" : "Transferencia (-25%)"}
                            </button>
                          </div>

                          {/* Payment type toggle */}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs text-gray-500">Metodo de pago:</span>
                            <button onClick={(e) => { e.stopPropagation(); chPay.mutate({ orderId: o.id, paymentType: o.paymentType === "efectivo" ? "transferencia" : "efectivo" }); }} className={`px-2 py-1 rounded text-xs font-bold border ${o.paymentType === "efectivo" ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-green-100 text-green-700 border-green-300"}`}>
                              {o.paymentType === "efectivo" ? "Efectivo (-30%)" : "Transferencia (-25%)"}
                            </button>
                          </div>

                          {/* Reject */}
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); if (confirm('Rechazar pedido? Se devuelve stock.')) rej.mutate({ id: o.id }); }} className="border-red-300 text-red-600 hover:bg-red-50">
                              <X className="w-3.5 h-3.5 mr-1" /> Rechazar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="text-center py-6 text-gray-400 bg-gray-50 border border-gray-200 border-dashed rounded-xl">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay pedidos pendientes</p>
              <p className="text-xs text-gray-400">Los pedidos nuevos de los revendedores apareceran aqui</p>
            </div>
          )}

          {/* ========== APPROVED ORDERS (caja) ========== */}
          <div className="flex items-center justify-between mb-2 mt-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Caja del dia</h2>
              <p className="text-xs text-gray-500">Pedidos aprobados de hoy + pendientes de cobro</p>
            </div>
            {dailyOrders && dailyOrders.length > 0 && (
              <Button onClick={() => { if (confirm(`Cerrar caja con ${dailyOrders.length} pedidos?`)) closeDaily.mutate({}); }} disabled={closeDaily.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {closeDaily.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 mr-1" />} Cerrar caja
              </Button>
            )}
          </div>

          {ld ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div> : (!dailyOrders || dailyOrders.length === 0) ? (
            <div className="text-center py-12 text-gray-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay pedidos aprobados para hoy</p>
              <p className="text-xs text-gray-400 mt-1">Los pedidos aprobados apareceran aqui</p>
            </div>
          ) : (
            dailyOrders?.map(o => {
              const isEditing = editingOrder === o.id;
              return (
                <div key={o.id} className={`bg-white border rounded-xl overflow-hidden shadow-sm ${(o as any).isOld ? "border-orange-200" : "border-gray-200"}`}>
                  <button onClick={() => setEditingOrder(isEditing ? null : o.id)} className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {/* Estado pago */}
                      {o.status === "approved" && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); 
                              const newType = o.paymentType === "efectivo" ? "transferencia" : "efectivo";
                              if (confirm(`¿Cambiar método de pago a ${newType === "efectivo" ? "Efectivo (-30%)" : "Transferencia (-25%)"}?`)) {
                                chPay.mutate({ orderId: o.id, paymentType: newType });
                              }
                            }}
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              o.paymentType === "efectivo" 
                                ? "bg-blue-100 text-blue-700 border border-blue-300" 
                                : "bg-green-100 text-green-700 border border-green-300"
                            }`}
                          >
                            {o.paymentType === "efectivo" ? "💰 Efectivo" : "💳 Transferencia"}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); togglePaid.mutate({ id: o.id }); }}
                            className={`px-2 py-1 rounded text-xs font-bold ${o.paid ? "bg-green-100 text-green-700 border border-green-300" : "bg-red-100 text-red-700 border border-red-300"}`}
                          >
                            {o.paid ? "Pagado" : "Pendiente"}
                          </button>
                        </div>
                      )}
                      {(o as any).isOld && <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">Dia anterior</Badge>}
                      <div className="text-left">
                        <p className="font-medium text-sm text-gray-900 flex items-center gap-2">
                          {o.remitoNumber ? <span className="text-blue-600">Remito #{o.remitoNumber}</span> : `Pedido #${o.id}`}
                          <span className="text-xs text-gray-400 font-normal">{(o as any).revendedorName ?? "-"}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {fmt(o.createdAt)} - {o.paymentType} {o.shippingType !== "none" && ` - ${o.shippingType === "express" ? "Express" : "Gratis"}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {(o as any).goldCoinsUsed > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                          <Coins className="w-3 h-3 mr-1" /> {(o as any).goldCoinsUsed}
                        </Badge>
                      )}
                      <span className="font-bold text-blue-600">
                        {(o as any).discountPesos > 0 ? (
                          <>
                            <span className="text-xs text-gray-400 line-through mr-1">{formatPrice(o.totalAmount)}</span>
                            {formatPrice(Math.max(0, Number(o.totalAmount) - Number((o as any).discountPesos)))}
                          </>
                        ) : formatPrice(o.totalAmount)}
                      </span>
                    </div>
                  </button>
                  {isEditing && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      {/* Info revendedor */}
                      {(() => {
                        const rev = allUsers?.find(u => u.id === o.userId);
                        return rev && (
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <p className="text-sm text-blue-800"><strong>{rev.name}</strong> ({rev.email}) {rev.phone && `- ${rev.phone}`}</p>
                          </div>
                        );
                      })()}

                      {/* Direccion */}
                      {o.notes && <p className="text-sm text-gray-500 mb-3 bg-gray-50 p-2 rounded flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {o.notes}</p>}

                      {/* Items */}
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Productos</h4>
                      {o.status === "pending" ? (
                        /* ===== PENDING ORDER — EDITABLE ===== */
                        <div className="space-y-2 mb-4">
                          {/* Edit each item */}
                          {orderDetail?.items && orderDetail.items.length > 0 ? orderDetail.items.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2 text-sm">
                              <div className="flex items-center gap-2 flex-1">
                  <span className="text-gray-900 truncate">{item.productName}</span>
                  <span className="text-xs text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                    📍 {products?.find(p => p.name === item.productName)?.location || "Sin ubicación"}
                  </span>
                </div>
                <span className="text-blue-600 font-medium w-20 text-right shrink-0">{formatPrice(item.price)}</span>
                              <span className="text-xs text-gray-400 w-16 text-center shrink-0">📍 {products?.find(p => p.name === item.productName)?.location || "Sin ubicación"}</span>
                              {/* Quantity controls */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); if (item.quantity > 1) upItem.mutate({ orderId: o.id, itemId: item.id, quantity: item.quantity - 1 }); }}
                                  className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold"
                                >-</button>
                                <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); upItem.mutate({ orderId: o.id, itemId: item.id, quantity: item.quantity + 1 }); }}
                                  className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold"
                                >+</button>
                              </div>
                              {/* Delete item */}
                              <button
                                onClick={(e) => { e.stopPropagation(); if (confirm(`Eliminar ${item.productName}?`)) rmItem.mutate({ orderId: o.id, itemId: item.id }); }}
                                className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )) : <p className="text-sm text-gray-400">No hay productos</p>}

                          {/* Add product */}
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-sm border border-dashed border-gray-300 mt-2">
                            <select
                              value={addProductId}
                              onChange={e => setAddProductId(e.target.value)}
                              className="flex-1 bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Agregar producto...</option>
                              {products?.filter(p => Number(p.stock ?? 0) > 0).map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.stock} disp.)
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); if (Number(addQty) > 1) setAddQty(String(Number(addQty) - 1)); }}
                                className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold"
                              >-</button>
                              <span className="w-8 text-center font-medium text-sm">{addQty}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setAddQty(String(Number(addQty) + 1)); }}
                                className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold"
                              >+</button>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); if (addProductId) { addItem.mutate({ orderId: o.id, productId: Number(addProductId), quantity: Number(addQty) }); } }}
                              disabled={!addProductId || addItem.isPending}
                              className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            >
                              {addItem.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Payment type toggle */}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs text-gray-500">Metodo de pago:</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); chPay.mutate({ orderId: o.id, paymentType: o.paymentType === "efectivo" ? "transferencia" : "efectivo" }); }}
                              className={`px-2 py-1 rounded text-xs font-bold border ${o.paymentType === "efectivo" ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-green-100 text-green-700 border-green-300"}`}
                            >
                              {o.paymentType === "efectivo" ? "Efectivo (-30%)" : "Transferencia (-25%)"}
                            </button>
                          </div>

                          {/* Reject button */}
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); if (confirm('Rechazar pedido? Se devuelve stock.')) rej.mutate({ id: o.id }); }} className="border-red-300 text-red-600 hover:bg-red-50">
                              <X className="w-3.5 h-3.5 mr-1" /> Rechazar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* ===== APPROVED ORDER — READ-ONLY ===== */
                        <>
                          {o.items && o.items.length > 0 ? (
                            <div className="space-y-2 mb-4">
                              {(o.items as any[]).map((item: any) => (
                                <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-sm">
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="text-gray-900 truncate">{item.productName}</span>
                                    <span className="text-xs text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                                      📍 {products?.find(p => p.name === item.productName)?.location || "Sin ubicación"}
                                    </span>
                                  </div>
                                  <span className="text-blue-600 font-medium w-20 text-right">{formatPrice(item.price)}</span>
                                  <span className="text-gray-500 w-8 text-center">x{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-sm text-gray-400 mb-3">No hay productos</p>}

                          {/* Boton anular — solo superadmin */}
                          <div className="flex gap-2 items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Método de pago:</span>
                              <button
                                onClick={() => {
                                  const newType = o.paymentType === "efectivo" ? "transferencia" : "efectivo";
                                  if (confirm(`¿Cambiar método de pago a ${newType === "efectivo" ? "Efectivo (-30%)" : "Transferencia (-25%)"}?`)) {
                                    chPay.mutate({ orderId: o.id, paymentType: newType });
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                                  o.paymentType === "efectivo" 
                                    ? "bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200" 
                                    : "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                                }`}
                              >
                                {o.paymentType === "efectivo" ? "💰 Efectivo (-30%)" : "💳 Transferencia (-25%)"}
                              </button>
                            </div>
                            {o.status === "approved" && isSuperadmin && (
                              <Button size="sm" variant="outline" onClick={() => { if (confirm('ANULAR? Se devuelve stock a Tiendanube y monedas.')) rej.mutate({ id: o.id }); }} className="border-red-300 text-red-600 hover:bg-red-50">
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Anular pedido
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* HISTORY — Historial de cierres */}
        <TabsContent value="history" className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Historial de Cierres</h2>
          {(!closureHistory || closureHistory.length === 0) ? (
            <div className="text-center py-16 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay cierres registrados</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="hidden md:grid grid-cols-[1fr,80px,80px,80px,120px,120px,120px,140px] gap-3 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase items-center">
                <span>Fecha</span><span className="text-right">Pedidos</span><span className="text-right">Pagados</span><span className="text-right">Pend.</span><span className="text-right">Efectivo</span><span className="text-right">Transfer</span><span className="text-right text-amber-600">Monedas</span><span className="text-right">Total Real</span>
              </div>
              {closureHistory.map((c: any) => (
                <div key={c.id} className="grid grid-cols-[1fr,80px,80px,80px,120px,120px,120px,140px] gap-3 px-4 py-3 border-t border-gray-100 items-center text-sm">
                  <span className="text-gray-900">{new Date(c.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="text-right font-medium">{c.totalOrders}</span>
                  <span className="text-right text-green-600">{c.paidOrders}</span>
                  <span className="text-right text-red-600">{c.pendingOrders}</span>
                  <span className="text-right">{formatPrice(c.totalCash)}</span>
                  <span className="text-right">{formatPrice(c.totalTransfer)}</span>
                  <span className="text-right font-bold text-amber-600">{c.totalDiscountCoins > 0 ? `-${formatPrice(c.totalDiscountCoins)}` : "-"}</span>
                  <span className="text-right font-bold text-blue-600">{formatPrice(c.totalReal ?? c.totalAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* IMPORT — solo superadmin */}
        {isSuperadmin && (
          <TabsContent value="import" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Sincronizacion con Tiendanube</h3>
              <p className="text-gray-500 text-sm mb-4">Importa todos los productos de tu tienda Tiendanube. Los que no esten en Tiendanube se eliminan.</p>
              <div className="flex gap-3">
                <Button onClick={() => sync.mutate()} disabled={sync.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {sync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />} Sincronizar
                </Button>
                <Button onClick={() => test.mutate()} variant="outline" className="border-gray-300 text-gray-700">Probar conexion</Button>
              </div>
              {sync.isSuccess && <p className="text-green-600 text-sm mt-3">{sync.data.imported} productos importados{sync.data.deleted ? `, ${sync.data.deleted} eliminados` : ""}</p>}
              {sync.isError && <p className="text-red-600 text-sm mt-3">Error: {sync.error.message}</p>}
            </div>
          </TabsContent>
        )}

        {/* SETTINGS — solo superadmin */}
        {isSuperadmin && (
          <TabsContent value="settings" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Configuracion</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(["storeName", "whatsappNumber", "tiendanubeApiToken", "tiendanubeStoreId", "webhookUrl"] as const).map(k => (
                  <div key={k} className={k === "webhookUrl" ? "md:col-span-2" : ""}>
                    <label className="text-sm text-gray-500 mb-1 block capitalize">
                      {k === "storeName" ? "Nombre de la tienda" : k === "whatsappNumber" ? "WhatsApp" : k === "tiendanubeApiToken" ? "API Token Tiendanube" : k === "tiendanubeStoreId" ? "Store ID Tiendanube" : "Webhook URL (n8n)"}
                    </label>
                    <Input defaultValue={(settings as any)?.[k] ?? ""} onChange={e => { const el = e.target; el.dataset.value = e.target.value; }} className="bg-gray-50 border-gray-300 text-gray-900 setting-input" data-key={k} />
                  </div>
                ))}
              </div>
              <Button onClick={() => { const vals: Record<string, string> = {}; document.querySelectorAll(".setting-input").forEach(i => { const el = i as HTMLInputElement; if (el.dataset.value) vals[el.dataset.key!] = el.dataset.value; }); upSet.mutate(vals); }} disabled={upSet.isPending} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                {upSet.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Guardar
              </Button>
            </div>
          </TabsContent>
        )}

        {/* SUPERADMINS — solo superadmin */}
        {isSuperadmin && (
          <TabsContent value="superadmins" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3 text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" /> Nuevo SuperAdmin
              </h3>
              <p className="text-xs text-gray-500 mb-3">Maximo 3 superadmins permitidos. Actualmente: {superadmins?.length ?? 0}/3</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <Input placeholder="Nombre" value={newSuperadmin.name} onChange={e => setNewSuperadmin({ ...newSuperadmin, name: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Input placeholder="Email" type="email" value={newSuperadmin.email} onChange={e => setNewSuperadmin({ ...newSuperadmin, email: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Input placeholder="Telefono" value={newSuperadmin.phone} onChange={e => setNewSuperadmin({ ...newSuperadmin, phone: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Input placeholder="Contrasena" type="password" value={newSuperadmin.password} onChange={e => setNewSuperadmin({ ...newSuperadmin, password: e.target.value })} className="bg-gray-50 border-gray-300 text-gray-900" />
                <Button
                  onClick={() => cSuperadmin.mutate(newSuperadmin)}
                  disabled={!newSuperadmin.name || !newSuperadmin.email || !newSuperadmin.password || (superadmins?.length ?? 0) >= 3}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" /> Crear SuperAdmin
                </Button>
              </div>
              {(superadmins?.length ?? 0) >= 3 && <p className="text-xs text-red-500 mt-2">Ya hay 3 superadmins. Elimina uno para crear otro.</p>}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-[1fr,200px,120px,80px,80px,80px] gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase items-center">
                <span>Nombre</span><span>Email</span><span>Telefono</span><span></span><span></span><span></span>
              </div>
              {superadmins?.map(a => (
                <div key={a.id} className="grid grid-cols-[1fr,200px,120px,80px,80px,80px] gap-4 px-4 py-3 border-t border-gray-100 items-center text-sm">
                  {editing === a.id ? (
                    <>
                      <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                      <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                      <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="bg-gray-50 border-gray-300 h-8 text-sm text-gray-900" />
                      <Button size="sm" onClick={() => upUser.mutate({ id: a.id, name: editForm.name, email: editForm.email, phone: editForm.phone })} className="bg-green-600 hover:bg-green-700 h-8 px-2"><Check className="w-3 h-3 text-white" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-8 px-2 text-gray-500"><X className="w-3 h-3" /></Button>
                      <div />
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-gray-900 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" /> {a.name}
                      </span>
                      <span className="text-gray-500">{a.email}</span>
                      <span className="text-gray-500">{a.phone || "-"}</span>
                      <button onClick={() => startEdit(a)} className="text-gray-400 hover:text-blue-600 flex justify-center"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => openPassDialog(a)} className="text-gray-400 hover:text-blue-600 flex justify-center"><Lock className="w-4 h-4" /></button>
                      <button onClick={() => { if (confirm('Eliminar este superadmin?')) dUser.mutate({ id: a.id }); }} className="text-gray-400 hover:text-red-500 flex justify-center"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              ))}
              {(!superadmins || superadmins.length === 0) && <div className="text-center py-8 text-gray-500 text-sm">No hay superadmins</div>}
            </div>
          </TabsContent>
        )}

        {/* VENTAS — solo superadmin: reporte diario por admin */}
        {isSuperadmin && (
          <TabsContent value="sales" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Rendicion de Ventas por Admin</h2>
            </div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">Total diario de pedidos aprobados y rechazados por cada administrador.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { if (confirm("ESTO ELIMINARA TODOS LOS PEDIDOS APROBADOS Y RECHAZADOS. Estas seguro?")) clearHistory.mutate(); }}
                disabled={clearHistory.isPending}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                {clearHistory.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3 mr-1" /> Borrar historial</>}
              </Button>
            </div>

            {ls ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div> : (!salesByAdmin || salesByAdmin.length === 0) ? (
              <div className="text-center py-16 text-gray-500 bg-white border border-gray-200 rounded-xl">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay ventas registradas aun</p>
                <p className="text-xs text-gray-400 mt-1">Los pedidos aprobados y rechazados apareceran aqui</p>
              </div>
            ) : (
              <>
                {/* Totales generales */}
                {(() => {
                  const totalAprobado = salesByAdmin.reduce((s, d) => s + d.approvedTotal, 0);
                  const totalRechazado = salesByAdmin.reduce((s, d) => s + d.rejectedTotal, 0);
                  const totalAprobados = salesByAdmin.reduce((s, d) => s + d.approvedCount, 0);
                  const totalRechazados = salesByAdmin.reduce((s, d) => s + d.rejectedCount, 0);
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-green-700">{formatPrice(totalAprobado)}</p>
                        <p className="text-xs text-green-600 font-medium">Total Aprobado</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-blue-700">{totalAprobados}</p>
                        <p className="text-xs text-blue-600 font-medium">Pedidos Aprobados</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-red-700">{formatPrice(totalRechazado)}</p>
                        <p className="text-xs text-red-600 font-medium">Total Rechazado</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-gray-700">{totalRechazados}</p>
                        <p className="text-xs text-gray-600 font-medium">Pedidos Rechazados</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Tabla por admin y fecha */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="hidden md:grid grid-cols-[1fr,130px,100px,120px,100px,120px,140px] gap-3 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase items-center">
                    <span>Administrador</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha</span>
                    <span className="text-center">Aprobados</span>
                    <span className="text-right">Total Aprobado</span>
                    <span className="text-center">Rechazados</span>
                    <span className="text-right">Total Rechazado</span>
                    <span className="text-right">Rendicion</span>
                  </div>
                  {salesByAdmin.map((row, idx) => {
                    const dateFmt = new Date(row.date + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
                    const isToday = row.date === new Date().toISOString().split("T")[0];
                    return (
                      <div key={idx} className={`grid grid-cols-1 md:grid-cols-[1fr,130px,100px,120px,100px,120px,140px] gap-3 px-4 py-3 border-t border-gray-100 items-center text-sm ${isToday ? "bg-blue-50/50" : ""}`}>
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" /> {row.adminName}
                        </span>
                        <span className="text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dateFmt}
                          {isToday && <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-[10px] ml-1">Hoy</Badge>}
                        </span>
                        <span className="text-center">
                          <Badge className="bg-green-100 text-green-700 border-green-300">{row.approvedCount}</Badge>
                        </span>
                        <span className="text-right font-semibold text-green-700">{formatPrice(row.approvedTotal)}</span>
                        <span className="text-center">
                          {row.rejectedCount > 0 ? <Badge className="bg-red-100 text-red-700 border-red-300">{row.rejectedCount}</Badge> : <span className="text-gray-400">-</span>}
                        </span>
                        <span className="text-right font-medium text-red-600">{row.rejectedTotal > 0 ? formatPrice(row.rejectedTotal) : <span className="text-gray-400">-</span>}</span>
                        <span className="text-right font-bold text-blue-700">{formatPrice(row.approvedTotal)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        )}

        {/* MONEDAS DE ORO — solo superadmin */}
        {isSuperadmin && (
          <TabsContent value="coins" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-bold text-gray-900">Monedas de Oro</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">1 moneda = $0.01 | Efectivo: 1% | Transferencia: 0.5% | Vencen mensualmente</p>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-700">{coinStats?.totalInCirculation ?? 0}</p>
                <p className="text-xs text-yellow-600 font-medium">En circulacion</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{coinStats?.earnedThisMonth ?? 0}</p>
                <p className="text-xs text-green-600 font-medium">Ganadas este mes</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{coinStats?.spentThisMonth ?? 0}</p>
                <p className="text-xs text-red-600 font-medium">Usadas este mes</p>
              </div>
            </div>

            {/* Asignar monedas manualmente */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-500" /> Asignar monedas manualmente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  value={coinAssign.userId}
                  onChange={e => setCoinAssign({ ...coinAssign, userId: e.target.value })}
                  className="w-full h-9 bg-gray-50 border border-gray-300 rounded-lg px-3 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar revendedor --</option>
                  {revs?.map(r => <option key={r.id} value={r.id}>{r.name} ({r.email}) - {r.goldCoins ?? 0} monedas</option>)}
                  {admins?.map(a => <option key={a.id} value={a.id}>{a.name} ({a.email}) - {a.goldCoins ?? 0} monedas</option>)}
                </select>
                <Input
                  placeholder="Cantidad de monedas"
                  type="number"
                  value={coinAssign.amount}
                  onChange={e => setCoinAssign({ ...coinAssign, amount: e.target.value })}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                />
                <Input
                  placeholder="Descripcion (opcional)"
                  value={coinAssign.description}
                  onChange={e => setCoinAssign({ ...coinAssign, description: e.target.value })}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                />
                <Button
                  onClick={() => {
                    if (!coinAssign.userId || !coinAssign.amount) return;
                    adminAddCoins.mutate({
                      userId: Number(coinAssign.userId),
                      amount: Number(coinAssign.amount),
                      description: coinAssign.description || undefined,
                    });
                  }}
                  disabled={!coinAssign.userId || !coinAssign.amount || adminAddCoins.isPending}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  {adminAddCoins.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Coins className="w-4 h-4 mr-1" /> Asignar monedas</>}
                </Button>
              </div>
              {adminAddCoins.isSuccess && (
                <p className="text-green-600 text-xs mt-2">{adminAddCoins.data.assigned} monedas asignadas a {adminAddCoins.data.userName}</p>
              )}
            </div>

            {/* Vencer monedas */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Vencer monedas del mes pasado</h3>
              <p className="text-xs text-gray-500 mb-3">
                Las monedas ganadas en un mes vencen al finalizar el siguiente mes.
                Mes actual: <strong>{coinStats?.currentMonth ?? "-"}</strong>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    now.setMonth(now.getMonth() - 1);
                    const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                    if (confirm(`Vencer todas las monedas ganadas en ${mk}?`)) expireCoins.mutate({ monthKey: mk });
                  }}
                  disabled={expireCoins.isPending}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  {expireCoins.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Clock className="w-3 h-3 mr-1" /> Vencer mes anterior</>}
                </Button>
              </div>
              {expireCoins.isSuccess && <p className="text-green-600 text-xs mt-2">{expireCoins.data.expiredCount} monedas vencidas</p>}
            </div>

            {/* Top usuarios */}
            {coinStats?.topUsers && coinStats.topUsers.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                  Top revendedores con mas monedas
                </div>
                {coinStats.topUsers.map((u, idx) => (
                  <div key={idx} className="flex justify-between px-4 py-3 border-t border-gray-100 text-sm">
                    <span className="text-gray-900 font-medium">{u.name}</span>
                    <span className="text-yellow-600 font-bold">{u.goldCoins} monedas</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog global para cambiar contrasena */}
      <Dialog open={passDialogOpen} onOpenChange={setPassDialogOpen}>
        <DialogContent className="bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" /> Cambiar Contrasena
            </DialogTitle>
          </DialogHeader>
          {changePassUser && (
            <form onSubmit={(e) => { e.preventDefault(); if (newPassword.length >= 4) chPass.mutate({ id: changePassUser.id, newPassword }); }} className="space-y-3 pt-2">
              <p className="text-sm text-gray-600">Usuario: <strong className="text-gray-900">{changePassUser.name}</strong></p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nueva contrasena (min 4 caracteres)</label>
                <Input type="password" placeholder="Nueva contrasena" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900" required minLength={4} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={chPass.isPending || newPassword.length < 4} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {chPass.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4 mr-1" /> Cambiar</>}
                </Button>
                <Button variant="ghost" type="button" onClick={closePassDialog} className="text-gray-500">Cancelar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
// Componente de selector de ubicación
function LocationSelector({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [type, setType] = useState<'shelf' | 'box'>('shelf');
  const [letter, setLetter] = useState('A');
  const [number, setNumber] = useState(1);
  const [boxNumber, setBoxNumber] = useState(1);
  
  // Parsear valor existente (ej: "B3" o "Caja-15")
  useEffect(() => {
    if (value) {
      if (value.startsWith('Caja-')) {
        setType('box');
        setBoxNumber(parseInt(value.replace('Caja-', '')) || 1);
      } else {
        setType('shelf');
        const match = value.match(/^([A-J])([1-5])$/);
        if (match) {
          setLetter(match[1]);
          setNumber(parseInt(match[2]));
        }
      }
    }
  }, [value]);
  
  // Generar código final
  const getCode = () => {
    if (type === 'shelf') {
      return `${letter}${number}`;
    } else {
      return `Caja-${boxNumber}`;
    }
  };
  
  // Notificar cambios
  useEffect(() => {
    onChange(getCode());
  }, [type, letter, number, boxNumber]);
  
  return (
    <div className="flex items-center gap-1">
      <select 
        value={type} 
        onChange={(e) => setType(e.target.value as 'shelf' | 'box')}
        className="h-8 text-xs bg-gray-50 border border-gray-300 rounded px-1"
      >
        <option value="shelf">📦 Estante</option>
        <option value="box">📦 Caja</option>
      </select>
      
      {type === 'shelf' ? (
        <>
          <select 
            value={letter} 
            onChange={(e) => setLetter(e.target.value)}
            className="w-12 h-8 text-center bg-gray-50 border border-gray-300 rounded"
          >
            {['A','B','C','D','E','F','G','H','I','J'].map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select 
            value={number} 
            onChange={(e) => setNumber(parseInt(e.target.value))}
            className="w-12 h-8 text-center bg-gray-50 border border-gray-300 rounded"
          >
            {[1,2,3,4,5].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </>
      ) : (
        <select 
          value={boxNumber} 
          onChange={(e) => setBoxNumber(parseInt(e.target.value))}
          className="w-16 h-8 text-center bg-gray-50 border border-gray-300 rounded"
        >
          {[...Array(20)].map((_, i) => (
            <option key={i+1} value={i+1}>{i+1}</option>
          ))}
        </select>
      )}
      <span className="text-xs font-mono bg-gray-100 px-1 rounded">
        {getCode()}
      </span>
    </div>
  );
}
