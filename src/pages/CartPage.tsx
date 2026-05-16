import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  FileText,
  MessageCircle,
  Loader2,
  Check,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import jsPDF from "jspdf";

export default function CartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [paymentType, setPaymentType] = useState<"efectivo" | "transferencia">(
    (user?.discountType as "efectivo" | "transferencia") ?? "efectivo"
  );
  const [notes, setNotes] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderData, setOrderData] = useState<{
    orderId: number;
    total: string;
    items: { productName: string; quantity: number; price: string; subtotal: string }[];
  } | null>(null);

  const { data: cartItems, isLoading } = trpc.cart.get.useQuery();
  const { data: adminData } = trpc.user.myAdmin.useQuery();

  const updateQty = trpc.cart.updateQuantity.useMutation({
    onSuccess: () => utils.cart.get.invalidate(),
  });
  const removeItem = trpc.cart.remove.useMutation({
    onSuccess: () => utils.cart.get.invalidate(),
  });
  const clearCart = trpc.cart.clear.useMutation({
    onSuccess: () => utils.cart.get.invalidate(),
  });
  const createOrder = trpc.order.create.useMutation({
    onSuccess: (data) => {
      utils.cart.get.invalidate();
      utils.order.myOrders.invalidate();
      setOrderData({
        orderId: data.orderId,
        total: data.order?.totalAmount ?? "0",
        items:
          data.order?.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            price: String(item.price),
            subtotal: String(item.subtotal),
          })) ?? [],
      });
      setOrderSuccess(true);
    },
  });

  const priceField = paymentType === "efectivo" ? "priceCash30" : "priceTransfer25";

  const cartCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const total = cartItems?.reduce((sum, item) => {
    const price = Number(item.product[priceField]);
    return sum + price * item.quantity;
  }, 0) ?? 0;

  const totalList = cartItems?.reduce((sum, item) => {
    const price = Number(item.product.priceList);
    return sum + price * item.quantity;
  }, 0) ?? 0;

  const savings = totalList - total;

  const handleGeneratePDF = () => {
    if (!orderData && !cartItems?.length) return;

    const doc = new jsPDF();
    const items = orderData
      ? orderData.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        }))
      : cartItems!.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: Number(item.product[priceField]),
          subtotal: Number(item.product[priceField]) * item.quantity,
        }));

    const finalTotal = orderData ? Number(orderData.total) : total;

    doc.setFontSize(18);
    doc.text("Genio de la Lampara - Pedido", 14, 20);

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, 14, 30);
    doc.text(`Revendedor: ${user?.name ?? ""}`, 14, 36);
    doc.text(`Forma de pago: ${paymentType === "efectivo" ? "Efectivo (30% off)" : "Transferencia (25% off)"}`, 14, 42);
    if (notes) doc.text(`Notas: ${notes}`, 14, 48);

    let y = 58;
    doc.setFontSize(10);
    doc.text("Producto", 14, y);
    doc.text("Cant.", 120, y);
    doc.text("P.Unit", 140, y);
    doc.text("Subtotal", 170, y);
    doc.line(14, y + 2, 196, y + 2);

    y += 10;
    doc.setFontSize(9);
    items.forEach((item) => {
      doc.text(item.productName.substring(0, 55), 14, y);
      doc.text(String(item.quantity), 125, y);
      doc.text(`$${item.price.toLocaleString("es-AR")}`, 140, y);
      doc.text(`$${item.subtotal.toLocaleString("es-AR")}`, 170, y);
      y += 7;
    });

    doc.line(14, y + 2, 196, y + 2);
    y += 10;
    doc.setFontSize(12);
    doc.text(`TOTAL: $${finalTotal.toLocaleString("es-AR")}`, 14, y);

    doc.save(`pedido-genio-${Date.now()}.pdf`);
    return doc;
  };

  const handleWhatsApp = () => {
    const adminPhone = adminData?.phone ?? "";
    if (!adminPhone) return;

    const items = orderData
      ? orderData.items
      : cartItems!.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: Number(item.product[priceField]),
          subtotal: Number(item.product[priceField]) * item.quantity,
        }));

    const finalTotal = orderData ? Number(orderData.total) : total;

    let msg = `*Pedido - Genio de la Lampara*\n\n`;
    msg += `*Revendedor:* ${user?.name}\n`;
    msg += `*Pago:* ${paymentType === "efectivo" ? "Efectivo (30% off)" : "Transferencia (25% off)"}\n\n`;
    msg += `*Productos:*\n`;
    items.forEach((item, i) => {
      msg += `${i + 1}. ${item.productName}\n`;
      msg += `   ${item.quantity}x $${item.price.toLocaleString("es-AR")} = $${item.subtotal.toLocaleString("es-AR")}\n`;
    });
    msg += `\n*TOTAL: $${finalTotal.toLocaleString("es-AR")}*\n`;
    if (notes) msg += `\nNotas: ${notes}`;

    const url = `https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
      </div>
    );
  }

  if (orderSuccess && orderData) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Pedido enviado!</h2>
        <p className="text-zinc-400 mb-6">
          Tu pedido fue enviado correctamente. Tu administrador lo revisara y te confirmara.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleGeneratePDF} variant="outline" className="border-zinc-700">
            <FileText className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
          <Button onClick={handleWhatsApp} className="bg-green-600 hover:bg-green-700">
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar por WhatsApp
          </Button>
        </div>
        <div className="mt-6">
          <Button variant="ghost" onClick={() => navigate("/productos")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a productos
          </Button>
        </div>
      </div>
    );
  }

  if (!cartItems?.length) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <ShoppingCart className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-2">Tu pedido esta vacio</h2>
        <p className="text-zinc-400 mb-6">Agrega productos desde la lista para armar tu pedido.</p>
        <Button onClick={() => navigate("/productos")} className="bg-yellow-500 hover:bg-yellow-600 text-black">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Ver productos
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/productos" className="text-zinc-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Tu Pedido</h1>
        <Badge className="bg-zinc-800 text-zinc-300">{cartCount} productos</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        {/* Cart items */}
        <div className="space-y-3">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.product.name}</p>
                <p className="text-yellow-500 font-semibold text-sm mt-1">
                  {formatPrice(item.product[priceField])} c/u
                </p>
                <p className="text-xs text-zinc-500 line-through">
                  Lista: {formatPrice(item.product.priceList)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty.mutate({ productId: item.productId, quantity: item.quantity - 1 })}
                  className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQty.mutate({ productId: item.productId, quantity: item.quantity + 1 })}
                  className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <p className="font-semibold text-sm w-24 text-right">
                {formatPrice(Number(item.product[priceField]) * item.quantity)}
              </p>

              <button
                onClick={() => removeItem.mutate({ productId: item.productId })}
                className="p-2 text-zinc-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearCart.mutate()}
            className="text-zinc-500 hover:text-red-400"
          >
            <Trash2 className="w-3 h-3 mr-2" />
            Vaciar pedido
          </Button>
        </div>

        {/* Checkout panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit sticky top-24">
          <h3 className="font-semibold text-lg mb-4">Resumen</h3>

          {/* Payment type selector */}
          <div className="mb-4">
            <p className="text-sm text-zinc-400 mb-2">Forma de pago</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentType("efectivo")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  paymentType === "efectivo"
                    ? "bg-yellow-500 text-black"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                Efectivo -30%
              </button>
              <button
                onClick={() => setPaymentType("transferencia")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  paymentType === "transferencia"
                    ? "bg-yellow-500 text-black"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                Transfer -25%
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between text-zinc-400">
              <span>Precio lista</span>
              <span className="line-through">{formatPrice(totalList)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Tu descuento ({paymentType === "efectivo" ? "30%" : "25%"})</span>
              <span className="text-green-400">-{formatPrice(savings)}</span>
            </div>
            <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-yellow-500">{formatPrice(total)}</span>
            </div>
            <div className="text-xs text-green-400">
              Ahorro: {formatPrice(savings)}
            </div>
          </div>

          {/* Notes */}
          <Textarea
            placeholder="Notas adicionales (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white text-sm mb-4"
          />

          {/* Actions */}
          <div className="space-y-2">
            <Button
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              onClick={() =>
                createOrder.mutate({ paymentType, notes: notes || undefined })
              }
              disabled={createOrder.isPending || cartCount === 0}
            >
              {createOrder.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ShoppingCart className="w-4 h-4 mr-2" />
              )}
              Confirmar pedido
            </Button>

            <Button
              variant="outline"
              className="w-full border-zinc-700"
              onClick={handleGeneratePDF}
            >
              <FileText className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>

            <Button
              variant="outline"
              className="w-full border-green-600 text-green-500 hover:bg-green-600/10"
              onClick={handleWhatsApp}
              disabled={!adminData?.phone}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar por WhatsApp
            </Button>
          </div>

          {!adminData?.phone && (
            <p className="text-xs text-red-400 mt-2 text-center">
              Tu admin no tiene WhatsApp configurado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
