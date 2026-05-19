import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ShoppingCart, ArrowLeft, FileText, Loader2, Download,
  MessageCircle, User, Zap, Coins,
} from "lucide-react";
import { Link } from "react-router";
import jsPDF from "jspdf";

/* ------------------------------------------------------------------ */
/*  WhatsApp SVG icon                                                  */
/* ------------------------------------------------------------------ */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type OrderItemPDF = {
  productName: string;
  quantity: number;
  unitList: number;
  unitPrice: number;
  unitProfit: number;
  subtotal: number;
  profitSubtotal: number;
};

const EXPRESS_SHIPPING = 5000;

export default function CartPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [paymentType, setPaymentType] = useState<"efectivo" | "transferencia">(
    (user?.discountType as "efectivo" | "transferencia") ?? "efectivo"
  );
  const [notes, setNotes] = useState("");
  const [expressShipping, setExpressShipping] = useState(false);
  const [useCoins, setUseCoins] = useState(false);
  const [goldCoinsUsed, setGoldCoinsUsed] = useState(0);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [showExpiryAlert, setShowExpiryAlert] = useState(false);
  const [orderMeta, setOrderMeta] = useState({ total: 0, totalList: 0, totalProfit: 0 });
  const orderItemsRef = useRef<OrderItemPDF[]>([]);

  /* query: cart */
  const { data: cart, isLoading } = trpc.cart.get.useQuery();
  const updateQty = trpc.cart.updateQuantity.useMutation({ onSuccess: () => utils.cart.get.invalidate() });
  const removeItem = trpc.cart.remove.useMutation({ onSuccess: () => utils.cart.get.invalidate() });
  const createOrder = trpc.order.create.useMutation({
    onSuccess: () => { utils.cart.get.invalidate(); utils.order.myOrders.invalidate(); },
  });

  /* query: admin asignado */
  const { data: myAdmin } = trpc.user.myAdmin.useQuery(undefined, { enabled: pdfGenerated });

  /* query: monedas de oro */
  const { data: coinBalance } = trpc.goldCoins.getBalance.useQuery();

  // Alerta de vencimiento: mostrar solo si quedan <= 7 dias y tiene monedas por vencer
  useEffect(() => {
    if (coinBalance && coinBalance.daysUntilExpiry <= 7 && coinBalance.expiringSoon > 0) {
      const dismissed = sessionStorage.getItem("goldCoinAlertDismissed");
      if (!dismissed) setShowExpiryAlert(true);
    }
  }, [coinBalance]);

  /* helpers de precios */
  const priceField: "products.priceCash30" | "products.priceTransfer25" =
    paymentType === "efectivo" ? "products.priceCash30" : "products.priceTransfer25";
  const priceKey = priceField.split(".")[1] as "priceCash30" | "priceTransfer25";

  const items = cart?.map(c => ({ ...c.cartItems, product: c.products })) ?? [];
  const subtotal = items.reduce((s, i) => s + Number(i.product[priceKey]) * i.quantity, 0);
  const totalList = items.reduce((s, i) => s + Number(i.product.priceList) * i.quantity, 0);
  const totalProfit = totalList - subtotal;
  const shippingCost = expressShipping ? EXPRESS_SHIPPING : 0;
  const coinDiscount = goldCoinsUsed * 0.01;
  const total = Math.max(0, subtotal + shippingCost - coinDiscount);

  /* ---------------------------------------------------------------- */
  /*  PDF generator                                                     */
  /* ---------------------------------------------------------------- */
  const generatePDF = useCallback((orderItems: OrderItemPDF[], meta: { total: number; totalList: number; totalProfit: number }, withShipping: boolean, coinsUsed: number = 0, coinsDiscount: number = 0) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Genio de la Lampara - Pedido", 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, 14, 30);
    doc.text(`Revendedor: ${user?.name ?? ""}`, 14, 36);
    doc.text(`Pago: ${paymentType === "efectivo" ? "Efectivo (-30%)" : "Transferencia (-25%)"}`, 14, 42);
    if (withShipping) doc.text("Envio: Express $5.000", 14, 48);
    if (notes) doc.text(`Notas: ${notes}`, 14, withShipping ? 54 : 48);

    const colProd = 14, colCant = 76, colList = 93, colDisc = 115, colGan = 138, colSub = 161, rightEdge = 196;
    let y = notes ? (withShipping ? 60 : 54) : (withShipping ? 54 : 48);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Producto", colProd, y);
    doc.text("Cant", colCant, y, { align: "center" });
    doc.text("Lista", colList, y, { align: "right" });
    doc.text("Tu Precio", colDisc, y, { align: "right" });
    doc.text("Ganancia", colGan, y, { align: "right" });
    doc.text("Subtotal", colSub, y, { align: "right" });
    doc.line(colProd, y + 2, rightEdge, y + 2);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    orderItems.forEach(item => {
      doc.text(item.productName.substring(0, 55), colProd, y);
      doc.text(String(item.quantity), colCant, y, { align: "center" });
      doc.text(`$${item.unitList.toLocaleString("es-AR")}`, colList, y, { align: "right" });
      doc.text(`$${item.unitPrice.toLocaleString("es-AR")}`, colDisc, y, { align: "right" });
      doc.setTextColor(34, 197, 94);
      doc.text(`+$${item.unitProfit.toLocaleString("es-AR")}`, colGan, y, { align: "right" });
      doc.setTextColor(0, 0, 0);
      doc.text(`$${item.subtotal.toLocaleString("es-AR")}`, colSub, y, { align: "right" });
      y += 6;
      if (y > 280) { doc.addPage(); y = 20; }
    });

    doc.line(colProd, y + 2, rightEdge, y + 2);
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Total Precio Lista:", 120, y);
    doc.text(`$${meta.totalList.toLocaleString("es-AR")}`, 175, y, { align: "right" });
    y += 7;
    doc.text("Tu Precio (con descuento):", 120, y);
    doc.setFont("helvetica", "bold");
    doc.text(`$${meta.total.toLocaleString("es-AR")}`, 175, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 7;

    // Monedas de oro
    if (coinsUsed > 0) {
      doc.setTextColor(202, 138, 4);
      doc.text(`Monedas de Oro (${coinsUsed}):`, 120, y);
      doc.text(`-$${coinsDiscount.toLocaleString("es-AR")}`, 175, y, { align: "right" });
      doc.setTextColor(0, 0, 0);
      y += 7;
    }

    if (withShipping) {
      doc.text("Envio Express:", 120, y);
      doc.text(`$${EXPRESS_SHIPPING.toLocaleString("es-AR")}`, 175, y, { align: "right" });
      y += 7;
    }

    // TOTAL A PAGAR (con monedas si aplica)
    doc.setFont("helvetica", "bold");
    const totalFinal = meta.total - coinsDiscount + (withShipping ? EXPRESS_SHIPPING : 0);
    doc.setTextColor(37, 99, 235);
    doc.text("TOTAL A PAGAR:", 120, y);
    doc.text(`$${totalFinal.toLocaleString("es-AR")}`, 175, y, { align: "right" });
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y += 7;

    doc.setTextColor(34, 197, 94);
    doc.setFont("helvetica", "bold");
    doc.text("GANANCIA NETA TOTAL:", 120, y);
    doc.text(`+$${meta.totalProfit.toLocaleString("es-AR")}`, 175, y, { align: "right" });
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y += 7;
    const pct = meta.totalList > 0 ? Math.round((meta.totalProfit / meta.totalList) * 100) : 0;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Margen de ganancia: ${pct}%`, 120, y);
    doc.setTextColor(0, 0, 0);

    doc.save(`pedido-genio-${Date.now()}.pdf`);
  }, [user?.name, paymentType, notes]);

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */
  const handleOrder = () => {
    if (items.length === 0) return;

    const orderItems = items.map(item => {
      const unitList = Number(item.product.priceList);
      const unitPrice = Number(item.product[priceKey]);
      return {
        productName: item.product.name,
        quantity: item.quantity,
        unitList,
        unitPrice,
        unitProfit: unitList - unitPrice,
        subtotal: unitPrice * item.quantity,
        profitSubtotal: (unitList - unitPrice) * item.quantity,
      };
    });
    orderItemsRef.current = orderItems;
    const meta = { total: subtotal, totalList, totalProfit };
    setOrderMeta(meta);

    createOrder.mutate(
      { paymentType, notes: notes || undefined, goldCoinsUsed: useCoins ? goldCoinsUsed : 0 },
      {
        onSuccess: () => {
          setTimeout(() => { generatePDF(orderItems, meta, expressShipping, useCoins ? goldCoinsUsed : 0, coinDiscount); setPdfGenerated(true); }, 300);
        },
      }
    );
  };

  const handleReDownloadPDF = () => {
    if (orderItemsRef.current.length > 0) {
      generatePDF(orderItemsRef.current, orderMeta, expressShipping, useCoins ? goldCoinsUsed : 0, coinDiscount);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  WhatsApp helpers                                                  */
  /* ---------------------------------------------------------------- */
  const buildWhatsAppMessage = (): string => {
    const lines = orderItemsRef.current.map(
      item => `• ${item.productName} x${item.quantity} = $${item.subtotal.toLocaleString("es-AR")} (Gana: +$${item.profitSubtotal.toLocaleString("es-AR")})`
    );
    const finalTotal = orderMeta.total - coinDiscount + (expressShipping ? EXPRESS_SHIPPING : 0);
    const msg =
      `Hola ${myAdmin?.name ?? ""}! Te envio mi pedido de Genio de la Lampara:\n\n` +
      lines.join("\n") +
      `\n\nTu precio: $${orderMeta.total.toLocaleString("es-AR")}` +
      (goldCoinsUsed > 0 ? `\nMonedas de Oro (${goldCoinsUsed}): -$${coinDiscount.toLocaleString("es-AR")}` : "") +
      (expressShipping ? `\nEnvio Express: $${EXPRESS_SHIPPING.toLocaleString("es-AR")}` : "") +
      `\n*TOTAL A PAGAR: $${finalTotal.toLocaleString("es-AR")}*` +
      `\nGanancia neta: +$${orderMeta.totalProfit.toLocaleString("es-AR")}` +
      `\nPago: ${paymentType === "efectivo" ? "Efectivo (30% descuento)" : "Transferencia (25% descuento)"}` +
      (goldCoinsUsed > 0 ? `\nPagado con puntos: $${coinDiscount.toLocaleString("es-AR")} | En efectivo: $${(finalTotal - (expressShipping ? EXPRESS_SHIPPING : 0)).toLocaleString("es-AR")}` : "") +
      (notes ? `\nNotas: ${notes}` : "") +
      `\nRevendedor: ${user?.name ?? ""}`;
    return encodeURIComponent(msg);
  };

  const whatsappUrl = myAdmin?.phone
    ? `https://wa.me/${myAdmin.phone.replace(/\D/g, "")}?text=${buildWhatsAppMessage()}`
    : null;

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                   */
  /* ---------------------------------------------------------------- */
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  /* ====== PANTALLA DE EXITO ====== */
  if (pdfGenerated) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <FileText className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Pedido generado!</h2>
          <p className="text-gray-500">Tu PDF se descargo automaticamente.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Resumen de tu pedido</h3>
          <div className="space-y-2 text-sm mb-4 max-h-56 overflow-y-auto pr-1">
            {orderItemsRef.current.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start py-1 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="truncate text-gray-800">{item.productName}</p>
                  <p className="text-xs text-gray-500">x{item.quantity} | Lista: ${item.unitList.toLocaleString("es-AR")} → Tu precio: ${item.unitPrice.toLocaleString("es-AR")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium text-gray-800">${item.subtotal.toLocaleString("es-AR")}</p>
                  <p className="text-xs text-green-600">+${item.profitSubtotal.toLocaleString("es-AR")} ganancia</p>
                </div>
              </div>
            ))}
          </div>
          {expressShipping && (
            <div className="flex justify-between text-sm text-gray-600 border-b border-gray-100 pb-2 mb-2">
              <span>Envio Express</span>
              <span>${EXPRESS_SHIPPING.toLocaleString("es-AR")}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Total Precio Lista</span>
              <span className="line-through">${orderMeta.totalList.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span className="text-gray-800">Tu precio</span>
              <span className="text-blue-600">${orderMeta.total.toLocaleString("es-AR")}</span>
            </div>
            {useCoins && goldCoinsUsed > 0 && (
              <div className="flex justify-between text-sm text-yellow-600 bg-yellow-50 rounded-lg px-3 py-1.5">
                <span>Monedas de Oro ({goldCoinsUsed})</span>
                <span>-${coinDiscount.toLocaleString("es-AR")}</span>
              </div>
            )}
            {expressShipping && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Envio Express</span>
                <span>${EXPRESS_SHIPPING.toLocaleString("es-AR")}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-green-600 bg-green-50 rounded-lg px-3 py-2">
              <span>GANANCIA NETA</span>
              <span>+${orderMeta.totalProfit.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between font-bold text-xl text-gray-900 border-t border-gray-200 pt-2">
              <span>TOTAL A PAGAR</span>
              <span className="text-blue-600">${(orderMeta.total - coinDiscount + (expressShipping ? EXPRESS_SHIPPING : 0)).toLocaleString("es-AR")}</span>
            </div>
            {useCoins && goldCoinsUsed > 0 && (
              <p className="text-xs text-gray-400 text-right">
                Efectivo: ${(orderMeta.total - coinDiscount).toLocaleString("es-AR")} | Puntos: ${coinDiscount.toLocaleString("es-AR")}
              </p>
            )}
          </div>
          {notes && <p className="text-xs text-gray-500 mt-2 italic">Notas: {notes}</p>}
        </div>

        {/* Info del admin asignado */}
        {myAdmin && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{myAdmin.name}</p>
              <p className="text-xs text-gray-500">Tu administrador asignado</p>
            </div>
            {myAdmin.phone && <span className="text-xs text-gray-400 shrink-0">{myAdmin.phone}</span>}
          </div>
        )}

        {/* Botones */}
        <div className="space-y-3 mb-8">
          {whatsappUrl ? (
            <Button
              className="w-full py-7 text-lg font-bold bg-green-600 hover:bg-green-500 text-white shadow-lg"
              size="lg"
              onClick={() => window.open(whatsappUrl, '_blank')}
            >
              <WhatsAppIcon className="w-6 h-6 mr-3" />
              Enviar pedido por WhatsApp
            </Button>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Tu administrador no tiene numero de WhatsApp configurado.</p>
            </div>
          )}
          <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 py-5" onClick={handleReDownloadPDF}>
            <Download className="w-4 h-4 mr-2" /> Descargar PDF de nuevo
          </Button>
        </div>

        <div className="text-center">
          <Link to="/productos">
            <Button variant="ghost" className="text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" /> Seguir comprando
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ====== CARRITO VACIO ====== */
  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tu pedido esta vacio</h2>
        <p className="text-gray-500 mb-6">Agrega productos para armar tu pedido.</p>
        <Link to="/productos">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white"><ArrowLeft className="w-4 h-4 mr-2" /> Ver productos</Button>
        </Link>
      </div>
    );
  }

  /* ====== CARRITO CON ITEMS ====== */
  return (
    <div className="max-w-4xl mx-auto">
      {/* Popup alerta vencimiento monedas */}
      {showExpiryAlert && coinBalance && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Coins className="w-7 h-7 text-yellow-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Tus monedas vencen pronto!</h3>
              <p className="text-sm text-gray-500 mb-1">
                Te quedan <strong className="text-yellow-600">{coinBalance.daysUntilExpiry} dias</strong> para usarlas.
              </p>
              <p className="text-sm text-gray-700 mb-4">
                Tenes <strong className="text-yellow-600">{coinBalance.expiringSoon} monedas</strong> ({formatPrice(coinBalance.expiringSoon * 0.01)}) que vencen este mes.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setShowExpiryAlert(false)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  Entendido
                </Button>
                <Button variant="ghost" onClick={() => { sessionStorage.setItem("goldCoinAlertDismissed", "1"); setShowExpiryAlert(false); }} className="text-gray-500">
                  No avisar mas
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <Link to="/productos" className="text-gray-400 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold text-gray-900">Tu Pedido</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6">
        {/* Cart items */}
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{item.product.name}</p>
                <p className="text-blue-600 font-semibold text-sm mt-1">{formatPrice(item.product[priceKey])} c/u</p>
                <p className="text-xs text-gray-400 line-through">Lista: {formatPrice(item.product.priceList)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty.mutate({ productId: item.productId, quantity: item.quantity - 1 })} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-lg font-bold">-</button>
                <span className="w-8 text-center font-medium text-gray-900">{item.quantity}</span>
                <button onClick={() => updateQty.mutate({ productId: item.productId, quantity: item.quantity + 1 })} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-lg font-bold">+</button>
              </div>
              <p className="font-semibold text-sm w-24 text-right text-gray-900">{formatPrice(Number(item.product[priceKey]) * item.quantity)}</p>
              <button onClick={() => removeItem.mutate({ productId: item.productId })} className="p-2 text-gray-400 hover:text-red-500 text-sm">Eliminar</button>
            </div>
          ))}
        </div>

        {/* Checkout panel */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 h-fit sticky top-24 shadow-sm">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">Resumen</h3>

          {/* Payment selector */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Forma de pago</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentType("efectivo")} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${paymentType === "efectivo" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>Efectivo -30%</button>
              <button onClick={() => setPaymentType("transferencia")} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${paymentType === "transferencia" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>Transfer -25%</button>
            </div>
          </div>

          {/* Envio Express */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Envio Express</p>
                <p className="text-xs text-gray-500">Entrega urgente +$5.000</p>
              </div>
            </div>
            <Switch checked={expressShipping} onCheckedChange={setExpressShipping} />
          </div>

          {/* Monedas de oro - Switch + slider condicional */}
          {coinBalance && coinBalance.balance > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm font-medium text-gray-900">Usar Monedas de Oro</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-yellow-600 font-bold">{coinBalance.balance}</span>
                  <Switch checked={useCoins} onCheckedChange={(checked) => { setUseCoins(checked); if (!checked) setGoldCoinsUsed(0); }} />
                </div>
              </div>
              {useCoins && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={Math.min(coinBalance.balance, Math.floor((subtotal + shippingCost) / 0.01))}
                      step={1}
                      value={goldCoinsUsed}
                      onChange={e => setGoldCoinsUsed(Number(e.target.value))}
                      className="flex-1 accent-yellow-500"
                    />
                    <span className="text-xs font-bold text-yellow-700 w-14 text-right">{goldCoinsUsed}</span>
                  </div>
                  {goldCoinsUsed > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">Descuento: {formatPrice(coinDiscount)}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between text-gray-500"><span>Precio lista</span><span className="line-through">{formatPrice(totalList)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Tu descuento ({paymentType === "efectivo" ? "30%" : "25%"})</span><span className="text-green-600">-{formatPrice(totalProfit)}</span></div>
            <div className="flex justify-between text-gray-900 font-medium"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            {expressShipping && (
              <div className="flex justify-between text-blue-600 font-medium"><span>Envio Express</span><span>{formatPrice(EXPRESS_SHIPPING)}</span></div>
            )}
            {goldCoinsUsed > 0 && (
              <div className="flex justify-between text-yellow-600 font-medium">
                <span>Monedas de oro ({goldCoinsUsed})</span>
                <span>-{formatPrice(coinDiscount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-lg">
              <span className="text-gray-900">Total</span>
              <span className="text-blue-600">{formatPrice(total)}</span>
            </div>
            <div className="text-xs text-green-600 font-medium bg-green-50 rounded px-2 py-1 text-center">
              Tu ganancia: +{formatPrice(totalProfit)} ({totalList > 0 ? Math.round((totalProfit / totalList) * 100) : 0}%)
            </div>
          </div>

          {/* Notes */}
          <Textarea placeholder="Notas adicionales (opcional)" value={notes} onChange={e => setNotes(e.target.value)} className="bg-gray-50 border-gray-200 text-gray-900 text-sm mb-4 placeholder:text-gray-400" />

          {/* CTA */}
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg" onClick={handleOrder} disabled={createOrder.isPending || items.length === 0}>
            {createOrder.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FileText className="w-5 h-5 mr-2" />}
            {createOrder.isPending ? "Generando..." : "Generar Pedido"}
          </Button>
          <p className="text-gray-400 text-xs text-center mt-2">Se descargara el PDF automaticamente</p>
        </div>
      </div>
    </div>
  );
}
