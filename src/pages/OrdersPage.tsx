import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export default function OrdersPage() {
  const { isAdmin } = useAuth();
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: myOrders, isLoading } = trpc.order.myOrders.useQuery();
  const { data: adminOrders } = trpc.order.myOrdersAsAdmin.useQuery(undefined, { enabled: isAdmin });
  const approve = trpc.order.approve.useMutation({ onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); utils.order.pendingOrders.invalidate(); } });
  const reject = trpc.order.reject.useMutation({ onSuccess: () => { utils.order.myOrdersAsAdmin.invalidate(); utils.order.pendingOrders.invalidate(); } });
  const orders = isAdmin ? (adminOrders ?? []) : (myOrders ?? []);

  const statusBadge = (s: string) => {
    if (s === "pending") return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
    if (s === "approved") return <Badge className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Aprobado</Badge>;
    return <Badge className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Rechazado</Badge>;
  };

  const fmt = (d: Date | string) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-yellow-500 animate-spin" /></div>;
  if (orders.length === 0) return <div className="text-center py-20 text-zinc-500"><Package className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No hay pedidos</p></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isAdmin ? "Pedidos" : "Mis Pedidos"}</h1>
      <div className="space-y-3">
        {orders.map(order => {
          const isExp = expanded === order.id;
          return (
            <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <button onClick={() => setExpanded(isExp ? null : order.id)} className="w-full px-4 py-4 flex items-center justify-between hover:bg-zinc-800/50">
                <div className="flex items-center gap-4">{statusBadge(order.status)}<div className="text-left"><p className="font-medium text-sm">Pedido #{order.id}</p><p className="text-xs text-zinc-400">{fmt(order.createdAt)} - {order.paymentType}</p></div></div>
                <div className="flex items-center gap-4"><span className="font-bold text-yellow-500">{formatPrice(order.totalAmount)}</span>{isExp ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}</div>
              </button>
              {isExp && <OrderDetails orderId={order.id} isAdmin={isAdmin} onApprove={() => approve.mutate({ id: order.id })} onReject={() => reject.mutate({ id: order.id })} status={order.status} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderDetails({ orderId, isAdmin, onApprove, onReject, status }: { orderId: number; isAdmin: boolean; onApprove: () => void; onReject: () => void; status: string }) {
  const { data } = trpc.order.byId.useQuery({ id: orderId });
  return (
    <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
      {data?.items?.map(item => (
        <div key={item.id} className="flex justify-between py-1 text-sm"><span className="flex-1 truncate">{item.productName}</span><span className="text-zinc-400 w-16 text-center">x{item.quantity}</span><span className="w-24 text-right">{formatPrice(item.price)}</span><span className="w-24 text-right font-medium">{formatPrice(item.subtotal)}</span></div>
      ))}
      {data?.notes && <p className="text-sm text-zinc-400 mt-2 bg-zinc-800/50 p-2 rounded">Notas: {data.notes}</p>}
      {isAdmin && status === "pending" && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 mr-2" /> Aprobar</Button>
          <Button size="sm" variant="outline" onClick={onReject} className="border-red-600 text-red-500"><XCircle className="w-4 h-4 mr-2" /> Rechazar</Button>
        </div>
      )}
    </div>
  );
}
