import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Package,
  Users,
  Download,
  Settings,
  ClipboardList,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
export default function AdminPage() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("products");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  // New product form
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    priceList: "",
    stock: "0",
  });

  // New revendedor form
  const [newRevendedor, setNewRevendedor] = useState({
    name: "",
    email: "",
    phone: "",
    discountType: "efectivo" as "efectivo" | "transferencia",
    unionId: "",
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    storeName: "",
    whatsappNumber: "",
    tiendanubeApiToken: "",
    tiendanubeStoreId: "",
    webhookUrl: "",
  });

  // Data
  const { data: products, isLoading: loadingProducts } = trpc.product.list.useQuery();
  const { data: revendedores, isLoading: loadingRev } = trpc.user.myRevendedores.useQuery();
  const { data: orders, isLoading: loadingOrders } = trpc.order.myOrdersAsAdmin.useQuery();
  const { data: pendingOrders, isLoading: loadingPending } = trpc.order.pendingOrders.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();

  // Mutations
  const createProduct = trpc.product.create.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
      setNewProduct({ name: "", category: "", priceList: "", stock: "0" });
    },
  });
  const deleteProduct = trpc.product.delete.useMutation({
    onSuccess: () => utils.product.list.invalidate(),
  });
  const clearProducts = trpc.product.clearAll.useMutation({
    onSuccess: () => utils.product.list.invalidate(),
  });
  const createRev = trpc.user.createRevendedor.useMutation({
    onSuccess: () => {
      utils.user.myRevendedores.invalidate();
      setNewRevendedor({ name: "", email: "", phone: "", discountType: "efectivo", unionId: "" });
    },
  });
  const deleteRev = trpc.user.delete.useMutation({
    onSuccess: () => utils.user.myRevendedores.invalidate(),
  });
  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
  });
  const syncTiendanube = trpc.tiendanube.sync.useMutation({
    onSuccess: () => utils.product.list.invalidate(),
  });
  const testTiendanube = trpc.tiendanube.test.useMutation();
  const approveOrder = trpc.order.approve.useMutation({
    onSuccess: () => {
      utils.order.myOrdersAsAdmin.invalidate();
      utils.order.pendingOrders.invalidate();
    },
  });
  const rejectOrder = trpc.order.reject.useMutation({
    onSuccess: () => {
      utils.order.myOrdersAsAdmin.invalidate();
      utils.order.pendingOrders.invalidate();
    },
  });

  const pendingCount = pendingOrders?.length ?? 0;

  const handleSaveSettings = () => {
    updateSettings.mutate({
      storeName: settingsForm.storeName || undefined,
      whatsappNumber: settingsForm.whatsappNumber || undefined,
      tiendanubeApiToken: settingsForm.tiendanubeApiToken || undefined,
      tiendanubeStoreId: settingsForm.tiendanubeStoreId || undefined,
      webhookUrl: settingsForm.webhookUrl || undefined,
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Panel de Administracion</h1>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
              {pendingCount} pedidos pendientes
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
          <TabsTrigger value="products" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <Package className="w-4 h-4 mr-2" />
            Productos ({products?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="revendedores" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <Users className="w-4 h-4 mr-2" />
            Revendedores ({revendedores?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <ClipboardList className="w-4 h-4 mr-2" />
            Pedidos ({orders?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="import" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <Download className="w-4 h-4 mr-2" />
            Importar
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <Settings className="w-4 h-4 mr-2" />
            Config
          </TabsTrigger>
        </TabsList>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="space-y-6">
          {/* Add new product */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="font-semibold mb-4">Nuevo producto</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Input
                placeholder="Nombre"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Input
                placeholder="Categoria"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Input
                placeholder="Precio lista"
                type="number"
                value={newProduct.priceList}
                onChange={(e) => setNewProduct({ ...newProduct, priceList: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Input
                placeholder="Stock"
                type="number"
                value={newProduct.stock}
                onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Button
                onClick={() =>
                  createProduct.mutate({
                    name: newProduct.name,
                    category: newProduct.category,
                    priceList: Number(newProduct.priceList),
                    stock: Number(newProduct.stock),
                  })
                }
                disabled={createProduct.isPending || !newProduct.name || !newProduct.category || !newProduct.priceList}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-zinc-400">{products?.length ?? 0} productos</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearProducts.mutate()}
              className="border-red-600 text-red-500 hover:bg-red-600/10"
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Vaciar lista
            </Button>
          </div>

          {/* Product list */}
          {loadingProducts ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr,150px,120px,120px,80px,80px] gap-4 px-4 py-3 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase">
                <span>Nombre</span>
                <span>Categoria</span>
                <span className="text-right">Precio Lista</span>
                <span className="text-right">Efectivo</span>
                <span className="text-center">Stock</span>
                <span></span>
              </div>
              {products?.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-[1fr,150px,120px,120px,80px,80px] gap-4 px-4 py-3 border-t border-zinc-800/50 items-center text-sm"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-zinc-400 text-sm">{p.category}</span>
                  <span className="text-right text-zinc-400 line-through">
                    {formatPrice(p.priceList)}
                  </span>
                  <span className="text-right text-yellow-500 font-medium">
                    {formatPrice(p.priceCash30)}
                  </span>
                  <span className="text-center">{p.stock}</span>
                  <button
                    onClick={() => deleteProduct.mutate({ id: p.id })}
                    className="text-zinc-500 hover:text-red-400 flex justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* REVENDEDORES TAB */}
        <TabsContent value="revendedores" className="space-y-6">
          {/* Add revendedor */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="font-semibold mb-4">Nuevo revendedor</h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <Input
                placeholder="Nombre"
                value={newRevendedor.name}
                onChange={(e) => setNewRevendedor({ ...newRevendedor, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Input
                placeholder="Email"
                type="email"
                value={newRevendedor.email}
                onChange={(e) => setNewRevendedor({ ...newRevendedor, email: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Input
                placeholder="Telefono"
                value={newRevendedor.phone}
                onChange={(e) => setNewRevendedor({ ...newRevendedor, phone: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Input
                placeholder="Union ID de Kimi"
                value={newRevendedor.unionId}
                onChange={(e) => setNewRevendedor({ ...newRevendedor, unionId: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <select
                value={newRevendedor.discountType}
                onChange={(e) =>
                  setNewRevendedor({
                    ...newRevendedor,
                    discountType: e.target.value as "efectivo" | "transferencia",
                  })
                }
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white"
              >
                <option value="efectivo">Efectivo (30%)</option>
                <option value="transferencia">Transferencia (25%)</option>
              </select>
              <Button
                onClick={() =>
                  createRev.mutate({
                    name: newRevendedor.name,
                    email: newRevendedor.email,
                    phone: newRevendedor.phone || undefined,
                    discountType: newRevendedor.discountType,
                    unionId: newRevendedor.unionId,
                  })
                }
                disabled={createRev.isPending || !newRevendedor.name || !newRevendedor.email || !newRevendedor.unionId}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear
              </Button>
            </div>
          </div>

          {/* Revendedores list */}
          {loadingRev ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr,200px,120px,120px,80px] gap-4 px-4 py-3 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase">
                <span>Nombre</span>
                <span>Email</span>
                <span>Telefono</span>
                <span>Descuento</span>
                <span></span>
              </div>
              {revendedores?.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-[1fr,200px,120px,120px,80px] gap-4 px-4 py-3 border-t border-zinc-800/50 items-center text-sm"
                >
                  <span>{r.name}</span>
                  <span className="text-zinc-400">{r.email}</span>
                  <span className="text-zinc-400">{r.phone || "-"}</span>
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 w-fit">
                    {r.discountType === "efectivo" ? "30%" : "25%"}
                  </Badge>
                  <button
                    onClick={() => deleteRev.mutate({ id: r.id })}
                    className="text-zinc-500 hover:text-red-400 flex justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!revendedores || revendedores.length === 0) && (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  No hay revendedores asignados
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ORDERS TAB */}
        <TabsContent value="orders" className="space-y-4">
          {loadingOrders || loadingPending ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
            </div>
          ) : orders?.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay pedidos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders?.map((order) => {
                const isExpanded = expandedOrder === order.id;
                return (
                  <div
                    key={order.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="w-full px-4 py-4 flex items-center justify-between hover:bg-zinc-800/50"
                    >
                      <div className="flex items-center gap-4">
                        <Badge
                          className={
                            order.status === "pending"
                              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                              : order.status === "approved"
                              ? "bg-green-500/10 text-green-500 border-green-500/30"
                              : "bg-red-500/10 text-red-500 border-red-500/30"
                          }
                        >
                          {order.status === "pending" ? "Pendiente" : order.status === "approved" ? "Aprobado" : "Rechazado"}
                        </Badge>
                        <div className="text-left">
                          <p className="font-medium text-sm">Pedido #{order.id}</p>
                          <p className="text-xs text-zinc-400">
                            {formatDate(order.createdAt)} - {order.paymentType}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-yellow-500">{formatPrice(order.totalAmount)}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
                        <div className="text-sm space-y-1 mb-4">
                          {order.notes && (
                            <p className="text-zinc-400 mb-2">Notas: {order.notes}</p>
                          )}
                        </div>
                        {order.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveOrder.mutate({ id: order.id })}
                              disabled={approveOrder.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectOrder.mutate({ id: order.id })}
                              disabled={rejectOrder.isPending}
                              className="border-red-600 text-red-500 hover:bg-red-600/10"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* IMPORT TAB */}
        <TabsContent value="import" className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-2">Sincronizacion con Tiendanube</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Importa y actualiza todos los productos de tu tienda Tiendanube automaticamente.
              Configura tus credenciales en la pestana Configuracion primero.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => syncTiendanube.mutate()}
                disabled={syncTiendanube.isPending}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {syncTiendanube.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sincronizar productos
              </Button>
              <Button
                onClick={() => testTiendanube.mutate()}
                disabled={testTiendanube.isPending}
                variant="outline"
                className="border-zinc-700"
              >
                {testTiendanube.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Probar conexion
              </Button>
            </div>

            {syncTiendanube.isSuccess && (
              <p className="text-green-400 text-sm mt-4">
                {syncTiendanube.data.imported} productos sincronizados correctamente
              </p>
            )}
            {syncTiendanube.isError && (
              <p className="text-red-400 text-sm mt-4">
                Error: {syncTiendanube.error.message}
              </p>
            )}
            {testTiendanube.isSuccess && (
              <p className={`text-sm mt-4 ${testTiendanube.data.success ? "text-green-400" : "text-red-400"}`}>
                {testTiendanube.data.success
                  ? "Conexion exitosa con Tiendanube"
                  : `Error: ${testTiendanube.data.error || "No se pudo conectar"}`}
              </p>
            )}
          </div>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-4">Configuracion</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Nombre de la tienda</label>
                <Input
                  placeholder="Genio de la Lampara"
                  defaultValue={settings?.storeName ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Numero de WhatsApp</label>
                <Input
                  placeholder="5491123456789"
                  defaultValue={settings?.whatsappNumber ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
                <p className="text-xs text-zinc-500 mt-1">Formato: codigo pais + numero sin +</p>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">API Token de Tiendanube</label>
                <Input
                  placeholder="tu-api-token"
                  defaultValue={settings?.tiendanubeApiToken ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, tiendanubeApiToken: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">ID de Tienda Tiendanube</label>
                <Input
                  placeholder="123456"
                  defaultValue={settings?.tiendanubeStoreId ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, tiendanubeStoreId: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-zinc-400 mb-1 block">URL del Webhook (n8n)</label>
                <Input
                  placeholder="http://localhost:5678/webhook/pedido-aprobado"
                  defaultValue={settings?.webhookUrl ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, webhookUrl: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  URL del webhook de n8n que se ejecuta cuando se aprueba un pedido
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Button
                onClick={handleSaveSettings}
                disabled={updateSettings.isPending}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {updateSettings.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar cambios
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
