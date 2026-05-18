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

  const orders: OrderWithItems[] = isAdmin ? (adminOrders ?? []) : (myOrders ?? []);

  // Filtrar por estado
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const statusBadge = (s: string) => {
    if (s === "pending") return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
    if (s === "approved") return <Badge className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Aprobado</Badge>;
    return <Badge className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Rechazado</Badge>;
  };

  const fmt = (d: Date | string) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    approved: orders.filter(o => o.status === "approved").length,
    rejected: orders.filter(o => o.status === "rejected").length,
  };

  if (isLoading || (isAdmin && loadingAdmin)) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-yellow-500 animate-spin" /></div>;
  }

  if (orders.length === 0) {
    return <div className="text-center py-20 text-zinc-500"><Package className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No hay pedidos</p></div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{isAdmin ? "Pedidos de mis Revendedores" : "Mis Pedidos"}</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-yellow-500 text-black"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
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
            <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {/* Header */}
              <button onClick={() => setExpanded(isExp ? null : order.id)} className="w-full px-4 py-4 flex items-center justify-between hover:bg-zinc-800/50">
                <div className="flex items-center gap-3">
                  {statusBadge(order.status)}
                  <div className="text-left">
                    <p className="font-medium text-sm">Pedido #{order.id}</p>
                    <p className="text-xs text-zinc-400">{fmt(order.createdAt)} — {order.paymentType === "efectivo" ? "Efectivo -30%" : "Transferencia -25%"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-yellow-500">{formatPrice(order.totalAmount)}</span>
                  {isExp ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </div>
              </button>

              {/* Expanded details */}
              {isExp && (
                <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
                  {/* Revendedor info (solo admin) */}
                  {isAdmin && "revendedorName" in order && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 mb-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-yellow-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{(order as any).revendedorName}</p>
                        {(order as any).revendedorPhone && (
                          <p className="text-xs text-zinc-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {(order as any).revendedorPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Productos */}
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Productos</h4>
                  <div className="space-y-1 mb-3">
                    {(order as any).items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center py-1.5 text-sm border-b border-zinc-800/50 last:border-0">
                        <span className="flex-1 truncate text-zinc-300">{item.productName}</span>
                        <span className="text-zinc-500 w-12 text-center">x{item.quantity}</span>
                        <span className="w-20 text-right text-zinc-400">{formatPrice(item.price)} c/u</span>
                        <span className="w-24 text-right font-medium text-zinc-200">{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                    {!(order as any).items?.length && <p className="text-xs text-zinc-500">Sin detalle de productos</p>}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center border-t border-zinc-700 pt-2 mb-3">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-yellow-500 text-lg">{formatPrice(order.totalAmount)}</span>
                  </div>

                  {/* Notas */}
                  {order.notes && <p className="text-sm text-zinc-400 mb-3 bg-zinc-800/50 p-2 rounded">Notas: {order.notes}</p>}

                  {/* Acciones admin */}
                  {isAdmin && (
                    <div className="flex flex-wrap gap-2">
                      {order.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => approve.mutate({ id: order.id })} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => reject.mutate({ id: order.id })} className="border-red-600 text-red-500 hover:bg-red-600/10">
                            <XCircle className="w-4 h-4 mr-1" /> Rechazar
                          </Button>
                        </>
                      )}

                      {/* Descargar PDF */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                        onClick={() => generateOrderPDF(order)}
                      >
                        <FileText className="w-4 h-4 mr-1" /> Descargar PDF
                      </Button>

                      {/* Eliminar */}
                      {confirmDelete === order.id ? (
                        <div className="flex items-center gap-2 bg-red-500/10 rounded-lg px-3 py-1">
                          <span className="text-xs text-red-400">Seguro?</span>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 h-7 px-2 text-xs" onClick={() => deleteOrder.mutate({ id: order.id })}>Si, eliminar</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-red-400" onClick={() => setConfirmDelete(order.id)}>
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
          <div className="text-center py-10 text-zinc-500">
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

    if (order.revendedorName) {
      doc.text(`Revendedor: ${order.revendedorName}`, 14, 48);
      if (order.revendedorPhone) doc.text(`Telefono: ${order.revendedorPhone}`, 14, 54);
    }

    let y = order.revendedorName ? 60 : 48;
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

    if (order.notes) {
      y += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Notas: ${order.notes}`, 14, y);
    }

    doc.save(`pedido-admin-${order.id}.pdf`);
  });
}
