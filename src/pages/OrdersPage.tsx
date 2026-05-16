import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, ROLES } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

export default function OrdersPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const isAdmin = user?.role === ROLES.ADMIN || user?.role === ROLES.SUPERADMIN;

  const { data: myOrders, isLoading: loadingMy } = trpc.order.myOrders.useQuery(
    undefined,
    { enabled: user?.role === ROLES.REVENDEDOR }
  );
  const { data: adminOrders, isLoading: loadingAdmin } =
    trpc.order.myOrdersAsAdmin.useQuery(
      undefined,
      { enabled: isAdmin }
    );
  const { data: pendingOrders, isLoading: loadingPending } =
    trpc.order.pendingOrders.useQuery(undefined, { enabled: isAdmin });

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

  const orders = isAdmin ? adminOrders ?? [] : myOrders ?? [];
  const pendingCount = pendingOrders?.length ?? 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" /> Pendiente
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" /> Aprobado
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" /> Rechazado
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {isAdmin ? "Pedidos" : "Mis Pedidos"}
          </h1>
          {isAdmin && pendingCount > 0 && (
            <p className="text-sm text-yellow-500 mt-1">
              {pendingCount} pedido{pendingCount > 1 ? "s" : ""} pendiente{pendingCount > 1 ? "s" : ""} de aprobacion
            </p>
          )}
        </div>
      </div>

      {(loadingMy || loadingAdmin || loadingPending) && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
        </div>
      )}

      {orders.length === 0 && !(loadingMy || loadingAdmin) && (
        <div className="text-center py-20 text-zinc-500">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay pedidos</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((order) => {
          const isExpanded = expandedOrder === order.id;

          return (
            <div
              key={order.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {getStatusBadge(order.status)}
                  <div className="text-left">
                    <p className="font-medium text-sm">
                      Pedido #{order.id}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatDate(order.createdAt)} - {order.paymentType === "efectivo" ? "Efectivo" : "Transferencia"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-bold text-yellow-500">
                    {formatPrice(order.totalAmount)}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
                  <div className="space-y-2 mb-4">
                    {/* Fetch order items */}
                    <OrderItems orderId={order.id} />
                  </div>

                  {order.notes && (
                    <p className="text-sm text-zinc-400 mb-4 bg-zinc-800/50 p-3 rounded-lg">
                      Notas: {order.notes}
                    </p>
                  )}

                  {isAdmin && order.status === "pending" && (
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
    </div>
  );
}

function OrderItems({ orderId }: { orderId: number }) {
  const { data: orderWithItems } = trpc.order.byId.useQuery({ id: orderId });

  if (!orderWithItems?.items) return null;

  return (
    <>
      {orderWithItems.items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between py-2 text-sm"
        >
          <span className="flex-1 truncate">{item.productName}</span>
          <span className="text-zinc-400 w-16 text-center">x{item.quantity}</span>
          <span className="w-24 text-right">{formatPrice(item.price)} c/u</span>
          <span className="w-24 text-right font-medium">{formatPrice(item.subtotal)}</span>
        </div>
      ))}
    </>
  );
}
