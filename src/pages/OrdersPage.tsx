import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Package, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp,
  Trash2, FileText, User, Phone, Filter
} from "lucide-react";
import { useState } from "react";
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
                  <div className="space-y-1 mb-3">
                    {(order as any).items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center py-1.5 text-sm border-b border-gray-100 last:border-0">
                        <span className="flex-1 truncate text-gray-700">{item.productName}</span>
                        <span className="text-gray-500 w-12 text-center">x{item.quantity}</span>
                        <span className="w-20 text-right text-gray-500">{formatPrice(item.price)} c/u</span>
                        <span className="w-24 text-right font-medium text-gray-900">{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                    {!(order as any).items?.length && <p className="text-xs text-gray-400">Sin detalle de productos</p>}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center border-t border-gray-200 pt-2 mb-3">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-blue-600 text-lg">{formatPrice(order.totalAmount)}</span>
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

    let y = order.revendedorName ? (order.remitoNumber ? 66 : 60) : (order.remitoNumber ? 54 : 48);
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

    doc.line(14, y + 2, 196, y + 2);
    y += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: $${Number(order.totalAmount).toLocaleString("es-AR")}`, 14, y);

    if (order.paid) {
      y += 6;
      doc.setTextColor(34, 197, 94);
      doc.text("PAGADO", 14, y);
      doc.setTextColor(0, 0, 0);
    } else if (order.status === "approved") {
      y += 6;
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
