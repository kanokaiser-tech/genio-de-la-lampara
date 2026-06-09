import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Package, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp,
  Trash2, FileText, User, Phone, Filter, Coins
} from "lucide-react";
import { useState } from "react";
import { Plus } from "lucide-react";
/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type OrderWithItems = any;

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */
export default function OrdersPage() {
  const { isAdmin } = useAuth();
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Queries
  const { data: myOrders, isLoading } = trpc.order.myOrders.useQuery();
  const { data: adminOrders, isLoading: loadingAdmin } = trpc.order.myOrdersAsAdmin.useQuery(
    undefined, { enabled: isAdmin }
  );
  const { data: products } = trpc.product.list.useQuery(undefined, { enabled: isAdmin });

  // Mutations
  const approve = trpc.order.approve.useMutation({
    onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); utils.order.myOrders.invalidate(); },
  });
  const reject = trpc.order.reject.useMutation({
    onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); utils.order.myOrders.invalidate(); },
  });
  const deleteOrder = trpc.order.delete.useMutation({
    onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); utils.order.myOrders.invalidate(); setConfirmDelete(null); },
  });
  const togglePaid = trpc.order.togglePaid.useMutation({
    onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); },
  });

  // Mutations para editar pedidos pendientes
  const updateItem = trpc.order.updateItem.useMutation({
    onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); utils.order.myOrders.invalidate(); },
  });
  const removeItem = trpc.order.removeItem.useMutation({
    onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); utils.order.myOrders.invalidate(); },
  });
  const addItem = trpc.order.addItem.useMutation({
    onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); utils.order.myOrders.invalidate(); },
  });
  const updatePayment = trpc.order.updatePaymentType.useMutation({
    onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); utils.order.myOrders.invalidate(); },
  });
  const addExtra = trpc.order.addExtra.useMutation({
    onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); utils.order.myOrders.invalidate(); setExtraDesc(""); setExtraPrice(""); setShowExtraForm(null); },
  });
  const removeExtra = trpc.order.removeExtra.useMutation({
    onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); utils.order.myOrders.invalidate(); },
  });

  // Estado para agregar producto a un pedido
  const [addProductId, setAddProductId] = useState("");
  const [addQty, setAddQty] = useState("1");

  // Estado para agregar item extra
  const [extraDesc, setExtraDesc] = useState("");
  const [extraPrice, setExtraPrice] = useState("");
  const [showExtraForm, setShowExtraForm] = useState<number | null>(null);

  const orders: OrderWithItems[] = isAdmin ? (adminOrders ?? []) : (myOrders ?? []);

  // Filtrar por estado
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const statusBadge = (s: string) => {
    if (s === "pending") return <Badge className="bg-amber-100 text-amber-700 border-amber-300"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
    if (s === "approved") return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" /> Aprobado</Badge>;
    return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" /> Rechazado</Badge>;
  };

  const fmt = (d: Date | string) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    approved: orders.filter(o => o.status === "approved").length,
    rejected: orders.filter(o => o.status === "rejected").length,
  };

  if (isLoading || (isAdmin && loadingAdmin)) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  if (orders.length === 0) {
    return <div className="text-center py-20 text-gray-500"><Package className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No hay pedidos</p></div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{isAdmin ? "Pedidos de mis Revendedores" : "Mis Pedidos"}</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {f === "all" ? "Todos" : f === "pending" ? "Pendientes" : f === "approved" ? "Aprobados" : "Rechazados"}
            <span className="ml-1.5 text-xs opacity-70">({statusCounts[f]})</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(order => {
          const isExp = expanded === order.id;
          return (
            <div key={order.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Header */}
              <button onClick={() => setExpanded(isExp ? null : order.id)} className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  {statusBadge(order.status)}
<div className="text-left">
  <p className="font-medium text-sm text-gray-900">
    {order.remitoNumber ? `Remito #${order.remitoNumber}` : `Pedido #${order.id}`}
    {isAdmin && (order as any).revendedorName && (
      <span className="text-gray-400 font-normal ml-2">{(order as any).revendedorName}</span>
    )}
    {isAdmin && order.status === "approved" && (
      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${order.paid ? "bg-green-100 text-green-700 border border-green-300" : "bg-red-100 text-red-700 border border-red-300"}`}>
        {order.paid ? "✓ Pagado" : "✗ No pagado"}
      </span>
    )}
  </p>
  <p className="text-xs text-gray-500">{fmt(order.createdAt)} — {order.paymentType === "efectivo" ? "Efectivo -30%" : "Transferencia -25%"}</p>
</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-blue-600">{formatPrice(order.totalAmount)}</span>
                  {isExp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Expanded details */}
              {isExp && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  {/* Revendedor info (solo admin) */}
                  {isAdmin && "revendedorName" in order && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{(order as any).revendedorName}</p>
                        {(order as any).revendedorPhone && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {(order as any).revendedorPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Boton Pagado/Pendiente (solo admin, pedidos aprobados) */}
                  {isAdmin && order.status === "approved" && (
                    <div className="mb-3">
                      <button
                        onClick={() => togglePaid.mutate({ id: order.id })}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                          order.paid
                            ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                            : "bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
                        }`}
                      >
                        {order.paid ? "Pagado" : "Pendiente de cobro"}
                      </button>
                    </div>
                  )}

                  {/* Productos */}
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Productos</h4>
                  <div className="space-y-2 mb-3">
                    {/* PEDIDO PENDIENTE + ADMIN = EDITABLE */}
                    {isAdmin && order.status === "pending" ? (
                      <>
                        {(order as any).items?.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2 text-sm">
                            <span className="flex-1 text-gray-900 truncate">{item.productName}</span>
                            <span className="text-blue-600 font-medium w-16 text-right shrink-0">{formatPrice(item.price)}</span>
                            {/* Cantidad +/- */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => { if (item.quantity > 1) updateItem.mutate({ orderId: order.id, itemId: item.id, quantity: item.quantity - 1 }); }}
                                className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold"
                              >-</button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <button
                                onClick={() => { updateItem.mutate({ orderId: order.id, itemId: item.id, quantity: item.quantity + 1 }); }}
                                className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold"
                              >+</button>
                            </div>
                            <span className="w-20 text-right font-medium text-gray-900 shrink-0">{formatPrice(item.subtotal)}</span>
                            {/* Eliminar producto */}
                            <button
                              onClick={() => { if (confirm(`Eliminar "${item.productName}" del pedido?`)) removeItem.mutate({ orderId: order.id, itemId: item.id }); }}
                              className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {/* Agregar producto */}
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-sm border border-dashed border-gray-300">
                          <select
                            value={addProductId}
                            onChange={e => setAddProductId(e.target.value)}
                            className="flex-1 bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Agregar producto...</option>
                            {products?.filter(p => Number(p.stock ?? 0) > 0).map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.stock} disp.)</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { if (Number(addQty) > 1) setAddQty(String(Number(addQty) - 1)); }} className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold">-</button>
                            <span className="w-8 text-center font-medium">{addQty}</span>
                            <button onClick={() => setAddQty(String(Number(addQty) + 1))} className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold">+</button>
                          </div>
                          <button
                            onClick={() => { if (addProductId) { addItem.mutate({ orderId: order.id, productId: Number(addProductId), quantity: Number(addQty) }); setAddProductId(""); setAddQty("1"); } }}
                            disabled={!addProductId || addItem.isPending}
                            className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                          >
                            {addItem.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                      </>
                    ) : (
                      /* PEDIDO APROBADO/RECHAZADO = SOLO LECTURA */
                      <>
                        {(order as any).items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center py-1.5 text-sm border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="truncate text-gray-700">{item.productName}</span>
                              <span className="text-xs text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                                📍 {products?.find(p => p.name === item.productName)?.location || "Sin ubicación"}
                              </span>
                            </div>
                            <span className="text-gray-500 w-12 text-center">x{item.quantity}</span>
                            <span className="w-20 text-right text-gray-500">{formatPrice(item.price)} c/u</span>
                            <span className="w-24 text-right font-medium text-gray-900">{formatPrice(item.subtotal)}</span>
                          </div>
                        ))}
                        {!(order as any).items?.length && <p className="text-xs text-gray-400">Sin detalle de productos</p>}
                      </>
                    )}
                  </div>

                  {/* Cambiar metodo de pago (admin, pedidos pendientes y aprobados) */}
                  {isAdmin && order.status !== "rejected" && (
                    <div className="flex items-center gap-2 pt-2 pb-1">
                      <span className="text-xs text-gray-500">Metodo de pago:</span>
                      <button
                        onClick={() => updatePayment.mutate({ orderId: order.id, paymentType: order.paymentType === "efectivo" ? "transferencia" : "efectivo" })}
                        disabled={updatePayment.isPending}
                        className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${order.paymentType === "efectivo" ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200" : "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"}`}
                      >
                        {order.paymentType === "efectivo" ? "Efectivo (-30%)" : "Transferencia (-25%)"}
                      </button>
                    </div>
                  )}

                  {/* Item Extra / Servicio Adicional (admin) - TEXTO LIBRE + PRECIO MANUAL */}
                  {isAdmin && order.status !== "rejected" && (
                    <div className="mt-4 mb-3 border-t border-dashed border-gray-300 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Plus className="w-4 h-4 text-purple-600" />
                        <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wide">Item Extra / Servicio</h4>
                        <span className="text-xs text-gray-400">(texto libre + precio manual)</span>
                      </div>

                      {/* Formulario para agregar extra */}
                      {showExtraForm === order.id ? (
                        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-3 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Descripcion del trabajo/servicio:</label>
                            <textarea
                              placeholder="Ej: Cambio de modulo A20 - mano de obra..."
                              value={extraDesc}
                              onChange={e => setExtraDesc(e.target.value)}
                              rows={2}
                              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                            />
                          </div>
                          <div className="flex gap-3 items-end">
                            <div className="w-40">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Precio ($):</label>
                              <input
                                type="number"
                                placeholder="35000"
                                value={extraPrice}
                                onChange={e => setExtraPrice(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              />
                            </div>
                            <button
                              onClick={() => { if (extraDesc && extraPrice) { addExtra.mutate({ orderId: order.id, description: extraDesc, price: parseFloat(extraPrice) }); } }}
                              disabled={!extraDesc || !extraPrice || addExtra.isPending}
                              className="px-6 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {addExtra.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Agregar al pedido"}
                            </button>
                            <button
                              onClick={() => setShowExtraForm(null)}
                              className="px-4 py-2 rounded-lg text-gray-500 text-sm hover:text-gray-700"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowExtraForm(order.id); setExtraDesc(""); setExtraPrice(""); }}
                          className="w-full py-3 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 font-medium hover:bg-purple-50 hover:border-purple-400 transition-all text-sm"
                        >
                          + Agregar item extra o servicio (escribir libremente)
                        </button>
                      )}

                      {/* Lista de extras ya agregados */}
                      {(order as any).extras?.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-gray-500">Items extras agregados:</p>
                          {(order as any).extras.map((extra: any) => (
                            <div key={extra.id} className="flex items-center justify-between bg-purple-100 border border-purple-200 rounded-xl px-4 py-3">
                              <span className="text-gray-800 font-medium">{extra.description}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-purple-700 text-lg">{formatPrice(Number(extra.price))}</span>
                                <button
                                  onClick={() => { if (confirm("Eliminar este item extra?")) removeExtra.mutate({ orderId: order.id, extraId: extra.id }); }}
                                  className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Descuento por monedas de oro */}
                  {Number((order as any).goldCoinsUsed ?? 0) > 0 && (
                    <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">Monedas de oro usadas</span>
                      </div>
                      <span className="text-sm font-bold text-amber-700">{(order as any).goldCoinsUsed} monedas = -{formatPrice((order as any).discountPesos)}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between items-center border-t border-gray-200 pt-2 mb-3">
                    <span className="font-bold text-gray-900">Total</span>
                    <div className="text-right">
                      {Number((order as any).discountPesos ?? 0) > 0 && (
                        <p className="text-xs text-gray-400 line-through">{formatPrice(order.totalAmount)}</p>
                      )}
                      <span className="font-bold text-blue-600 text-lg">{formatPrice(Math.max(0, Number(order.totalAmount) - Number((order as any).discountPesos ?? 0)))}</span>
                    </div>
                  </div>

                  {/* Notas */}
                  {order.notes && <p className="text-sm text-gray-500 mb-3 bg-gray-50 p-2 rounded">Direccion: {order.notes}</p>}

                  {/* Acciones admin */}
                  {isAdmin && (
                    <div className="flex flex-wrap gap-2">
                      {order.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => approve.mutate({ id: order.id })} className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => reject.mutate({ id: order.id })} className="border-red-300 text-red-600 hover:bg-red-50">
                            <XCircle className="w-4 h-4 mr-1" /> Rechazar
                          </Button>
                        </>
                      )}

                      {/* Descargar PDF */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        onClick={() => generateOrderPDF(order)}
                      >
                        <FileText className="w-4 h-4 mr-1" /> Descargar PDF
                      </Button>

                      {/* Eliminar */}
                      {confirmDelete === order.id ? (
                        <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-1">
                          <span className="text-xs text-red-600">Seguro?</span>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 h-7 px-2 text-xs text-white" onClick={() => deleteOrder.mutate({ id: order.id })}>Si, eliminar</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-500" onClick={() => setConfirmDelete(order.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay pedidos {filter !== "all" ? "con este filtro" : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Generador de PDF para un pedido (admin)                            */
/* ------------------------------------------------------------------ */
function generateOrderPDF(order: any) {
  import("jspdf").then(({ default: jsPDF }) => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Genio de la Lampara - Pedido", 14, 20);
    doc.setFontSize(10);
    doc.text(`Pedido #${order.id}`, 14, 30);
    doc.text(`Fecha: ${new Date(order.createdAt).toLocaleDateString("es-AR")}`, 14, 36);
    doc.text(`Pago: ${order.paymentType === "efectivo" ? "Efectivo (-30%)" : "Transferencia (-25%)"}`, 14, 42);

    if (order.remitoNumber) {
      doc.text(`Remito: #${order.remitoNumber}`, 14, 48);
    }

    if (order.revendedorName) {
      doc.text(`Revendedor: ${order.revendedorName}`, 14, order.remitoNumber ? 54 : 48);
      if (order.revendedorPhone) doc.text(`Telefono: ${order.revendedorPhone}`, 14, order.remitoNumber ? 60 : 54);
    }

    // Si uso monedas de oro, mostrar en el PDF
    const hasCoins = Number(order.goldCoinsUsed ?? 0) > 0;
    if (hasCoins) {
      const coinsY = order.revendedorName ? (order.remitoNumber ? 66 : 60) : (order.remitoNumber ? 54 : 48);
      doc.setTextColor(245, 158, 11);
      doc.setFont("helvetica", "bold");
      doc.text(`Monedas de oro usadas: ${order.goldCoinsUsed} = -$${Number(order.discountPesos).toLocaleString("es-AR")}`, 14, coinsY);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
    }

    let y = order.revendedorName ? (order.remitoNumber ? 66 : 60) : (order.remitoNumber ? 54 : 48);
    if (hasCoins) y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Producto", 14, y);
    doc.text("Cant.", 120, y);
    doc.text("P.Unit", 145, y);
    doc.text("Subtotal", 175, y);
    doc.line(14, y + 2, 196, y + 2);
    y += 8;
    doc.setFont("helvetica", "normal");

    if (order.items && order.items.length > 0) {
      order.items.forEach((item: any) => {
        doc.text(item.productName.substring(0, 50), 14, y);
        doc.text(String(item.quantity), 125, y);
        doc.text(`$${Number(item.price).toLocaleString("es-AR")}`, 145, y);
        doc.text(`$${Number(item.subtotal).toLocaleString("es-AR")}`, 175, y);
        y += 6;
      });
    }

    // Items extra en el PDF
    const hasExtras = order.extras && order.extras.length > 0;
    if (hasExtras) {
      y += 2;
      doc.setFontSize(8);
      doc.setTextColor(147, 51, 234);
      doc.setFont("helvetica", "bold");
      doc.text("EXTRAS:", 14, y);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      y += 5;
      order.extras.forEach((extra: any) => {
        doc.text(extra.description.substring(0, 50), 14, y);
        doc.text(`$${Number(extra.price).toLocaleString("es-AR")}`, 175, y);
        y += 5;
      });
      doc.setFontSize(9);
    }

    doc.line(14, y + 2, 196, y + 2);
    y += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");

    // Total con descuento por monedas
    if (hasCoins) {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.text(`Subtotal: $${Number(order.totalAmount).toLocaleString("es-AR")}`, 14, y);
      y += 5;
      doc.setTextColor(245, 158, 11);
      doc.setFont("helvetica", "bold");
      doc.text(`Descuento monedas de oro: -$${Number(order.discountPesos).toLocaleString("es-AR")}`, 14, y);
      y += 5;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
    }
    doc.setFontSize(12);
    const totalReal = Math.max(0, Number(order.totalAmount) - Number(order.discountPesos ?? 0));
    doc.text(`TOTAL: $${totalReal.toLocaleString("es-AR")}`, 14, y);

    y += 8;
    if (order.paid) {
      doc.setTextColor(34, 197, 94);
      doc.text("PAGADO", 14, y);
      doc.setTextColor(0, 0, 0);
    } else if (order.status === "approved") {
      doc.setTextColor(239, 68, 68);
      doc.text("PENDIENTE DE COBRO", 14, y);
      doc.setTextColor(0, 0, 0);
    }

    if (order.notes) {
      y += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Direccion: ${order.notes}`, 14, y);
    }

    doc.save(`pedido-admin-${order.id}.pdf`);
  });
}
