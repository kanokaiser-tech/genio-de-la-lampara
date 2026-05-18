import { useState, useRef, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, ArrowLeft, FileText, Loader2, Download, User, MessageCircle } from "lucide-react";
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
  unitList: number;   // precio de lista
  unitPrice: number;  // precio con descuento
  unitProfit: number; // ganancia por unidad
  subtotal: number;   // subtotal con descuento
  profitSubtotal: number; // ganancia total de esta linea
};

export default function CartPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [paymentType, setPaymentType] = useState<"efectivo" | "transferencia">(
    (user?.discountType as "efectivo" | "transferencia") ?? "efectivo"
  );
  const [notes, setNotes] = useState("");
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [orderMeta, setOrderMeta] = useState({ total: 0, totalList: 0, totalProfit: 0 });
  const orderItemsRef = useRef<OrderItemPDF[]>([]);
  const pdfDataUrlRef = useRef<string | null>(null);

  /* query: cart */
  const { data: cart, isLoading } = trpc.cart.get.useQuery();
  const updateQty = trpc.cart.updateQuantity.useMutation({ onSuccess: () => utils.cart.get.invalidate() });
  const removeItem = trpc.cart.remove.useMutation({ onSuccess: () => utils.cart.get.invalidate() });
  const createOrder = trpc.order.create.useMutation({
    onSuccess: () => { utils.cart.get.invalidate(); utils.order.myOrders.invalidate(); },
  });

  /* query: admin asignado (solo cuando se necesita) */
  const { data: myAdmin } = trpc.user.myAdmin.useQuery(undefined, { enabled: pdfGenerated });

  /* helpers de precios */
  const priceField: "products.priceCash30" | "products.priceTransfer25" =
    paymentType === "efectivo" ? "products.priceCash30" : "products.priceTransfer25";
  const priceKey = priceField.split(".")[1] as "priceCash30" | "priceTransfer25";

  const items = cart?.map(c => ({ ...c.cartItems, product: c.products })) ?? [];
  const total = items.reduce((s, i) => s + Number(i.product[priceKey]) * i.quantity, 0);
  const totalList = items.reduce((s, i) => s + Number(i.product.priceList) * i.quantity, 0);
  const totalProfit = totalList - total;
  const savings = totalList - total;

  /* ---------------------------------------------------------------- */
  /*  Detectar si estamos en la app nativa                              */
  /* ---------------------------------------------------------------- */
  const isNativeApp = () => {
    return navigator.userAgent.includes("GenioApp");
  };

  /* ---------------------------------------------------------------- */
  /*  PDF generator  —  con GANANCIA NETA                              */
  /* ---------------------------------------------------------------- */
  const generatePDF = useCallback((orderItems: OrderItemPDF[], meta: { total: number; totalList: number; totalProfit: number }) => {
    const doc = new jsPDF();

    /* --- Header --- */
    doc.setFontSize(18);
    doc.text("Genio de la Lampara - Pedido", 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, 14, 30);
    doc.text(`Revendedor: ${user?.name ?? ""}`, 14, 36);
    doc.text(`Pago: ${paymentType === "efectivo" ? "Efectivo (-30%)" : "Transferencia (-25%)"}`, 14, 42);
    if (notes) doc.text(`Notas: ${notes}`, 14, 48);

    /* --- Column positions (A4 = 210mm) --- */
    const colProd = 14;
    const colCant = 76;
    const colList = 93;
    const colDisc = 115;
    const colGan = 138;
    const colSub = 161;
    const rightEdge = 196;

    let y = notes ? 56 : 50;
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

    /* --- Rows --- */
    orderItems.forEach(item => {
      /* product name – wrap if needed */
      const name = item.productName;
      if (name.length > 38) {
        doc.text(name.substring(0, 38), colProd, y);
      } else {
        doc.text(name, colProd, y);
      }

      doc.text(String(item.quantity), colCant, y, { align: "center" });
      doc.text(`$${item.unitList.toLocaleString("es-AR")}`, colList, y, { align: "right" });
      doc.text(`$${item.unitPrice.toLocaleString("es-AR")}`, colDisc, y, { align: "right" });

      /* Ganancia in green */
      doc.setTextColor(34, 197, 94); // green
      doc.text(`+$${item.unitProfit.toLocaleString("es-AR")}`, colGan, y, { align: "right" });
      doc.setTextColor(0, 0, 0); // back to black

      doc.text(`$${item.subtotal.toLocaleString("es-AR")}`, colSub, y, { align: "right" });
      y += 6;

      /* page break if needed */
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    /* --- Separator --- */
    doc.line(colProd, y + 2, rightEdge, y + 2);
    y += 10;

    /* --- Totals block --- */
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

    // Generar dataURL para posible re-descarga o app nativa
    const dataUrl = doc.output('datauristring');
    pdfDataUrlRef.current = dataUrl;

    // Guardar en variable global para que la app nativa lo pida
    const w = window as any;
    w._lastPdfBase64 = dataUrl;
    w._lastPdfFilename = `pedido-genio-${Date.now()}.pdf`;

    // Si estamos en la app nativa, llamar al bridge de Android directamente
    if (isNativeApp()) {
      const w = window as any;
      if (w.Android && w.Android.downloadPDF) {
        w.Android.downloadPDF(dataUrl);
      }
    } else {
      // Navegador normal: descarga tradicional
      doc.save(`pedido-genio-${Date.now()}.pdf`);
    }
  }, [user?.name, paymentType, notes]);

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */
  const handleOrder = () => {
    if (items.length === 0) return;

    const orderItems: OrderItemPDF[] = items.map(item => {
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
    const meta = { total, totalList, totalProfit };
    setOrderMeta(meta);

    createOrder.mutate(
      { paymentType, notes: notes || undefined },
      {
        onSuccess: () => {
          setTimeout(() => { generatePDF(orderItems, meta); setPdfGenerated(true); }, 300);
        },
      }
    );
  };

  const handleReDownloadPDF = () => {
    if (orderItemsRef.current.length > 0) {
      generatePDF(orderItemsRef.current, orderMeta);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  WhatsApp helpers                                                  */
  /* ---------------------------------------------------------------- */
  const buildWhatsAppMessage = (): string => {
    const lines = orderItemsRef.current.map(
      item => `• ${item.productName} x${item.quantity} = $${item.subtotal.toLocaleString("es-AR")} (Gana: +$${item.profitSubtotal.toLocaleString("es-AR")})`
    );
    const msg =
      `Hola ${myAdmin?.name ?? ""}! Te envio mi pedido de Genio de la Lampara:\n\n` +
      lines.join("\n") +
      `\n\nTu precio total: $${orderMeta.total.toLocaleString("es-AR")}` +
      `\nGanancia neta: +$${orderMeta.totalProfit.toLocaleString("es-AR")}` +
      `\nPago: ${paymentType === "efectivo" ? "Efectivo (30% descuento)" : "Transferencia (25% descuento)"}` +
      (notes ? `\nNotas: ${notes}` : "") +
      `\nRevendedor: ${user?.name ?? ""}`;
    return encodeURIComponent(msg);
  };

  const whatsappUrl = myAdmin?.phone
    ? `https://wa.me/${myAdmin.phone.replace(/\D/g, "")}?text=${buildWhatsAppMessage()}`
    : null;

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
      </div>
    );
  }

  /* ====== PANTALLA DE EXITO ====== */
  if (pdfGenerated) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        {/* Header check */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-green-500/5">
            <FileText className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Pedido generado!</h2>
          <p className="text-zinc-400">Tu PDF se descargo automaticamente.</p>
        </div>

        {/* Tarjeta de resumen con GANANCIA */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Resumen de tu pedido</h3>

          {/* Items con ganancia */}
          <div className="space-y-2 text-sm mb-4 max-h-56 overflow-y-auto pr-1">
            {orderItemsRef.current.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start py-1 border-b border-zinc-800/50 last:border-0">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="truncate text-zinc-200">{item.productName}</p>
                  <p className="text-xs text-zinc-500">
                    x{item.quantity} | Lista: ${item.unitList.toLocaleString("es-AR")} → Tu precio: ${item.unitPrice.toLocaleString("es-AR")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium text-zinc-200">${item.subtotal.toLocaleString("es-AR")}</p>
                  <p className="text-xs text-green-400">+${item.profitSubtotal.toLocaleString("es-AR")} ganancia</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="border-t border-zinc-700 pt-3 space-y-2">
            <div className="flex justify-between text-sm text-zinc-400">
              <span>Total Precio Lista</span>
              <span className="line-through">${orderMeta.totalList.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span className="text-zinc-200">Tu precio</span>
              <span className="text-yellow-500">${orderMeta.total.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between font-bold text-green-400 bg-green-500/10 rounded-lg px-3 py-2">
              <span>GANANCIA NETA</span>
              <span>+${orderMeta.totalProfit.toLocaleString("es-AR")}</span>
            </div>
            {orderMeta.totalList > 0 && (
              <p className="text-xs text-green-500 text-center">
                Margen: {Math.round((orderMeta.totalProfit / orderMeta.totalList) * 100)}%
              </p>
            )}
          </div>
          {notes && <p className="text-xs text-zinc-500 mt-2 italic">Notas: {notes}</p>}
        </div>

        {/* Info del admin asignado */}
        {myAdmin && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{myAdmin.name}</p>
              <p className="text-xs text-zinc-500">Tu administrador asignado</p>
            </div>
            {myAdmin.phone && <span className="text-xs text-zinc-400 shrink-0">{myAdmin.phone}</span>}
          </div>
        )}

        {/* ===== BOTON PRINCIPAL: WHATSAPP ===== */}
        <div className="space-y-3 mb-8">
          {whatsappUrl ? (
            <Button
              className="w-full py-7 text-lg font-bold bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 transition-all hover:shadow-xl hover:shadow-green-900/30 hover:-translate-y-0.5"
              size="lg"
              onClick={() => {
                if (isNativeApp()) {
                  window.location.href = whatsappUrl;
                } else {
                  window.open(whatsappUrl, '_blank');
                }
              }}
            >
              <WhatsAppIcon className="w-6 h-6 mr-3" />
              Enviar pedido por WhatsApp
            </Button>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <MessageCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Tu administrador no tiene numero de WhatsApp configurado.</p>
              <p className="text-xs text-zinc-500 mt-1">Contactalo por otro medio.</p>
            </div>
          )}

          {/* Boton secundario: re-descargar PDF */}
          <Button
            variant="outline"
            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white py-5"
            onClick={handleReDownloadPDF}
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF de nuevo
          </Button>
        </div>

        {/* Accion secundaria */}
        <div className="text-center">
          <Link to="/productos">
            <Button variant="ghost" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Seguir comprando
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
        <ShoppingCart className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-2">Tu pedido esta vacio</h2>
        <p className="text-zinc-400 mb-6">Agrega productos para armar tu pedido.</p>
        <Link to="/productos">
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
            <ArrowLeft className="w-4 h-4 mr-2" /> Ver productos
          </Button>
        </Link>
      </div>
    );
  }

  /* ====== CARRITO CON ITEMS ====== */
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/productos" className="text-zinc-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold">Tu Pedido</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        {/* Cart items */}
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.product.name}</p>
                <p className="text-yellow-500 font-semibold text-sm mt-1">{formatPrice(item.product[priceKey])} c/u</p>
                <p className="text-xs text-zinc-500 line-through">Lista: {formatPrice(item.product.priceList)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty.mutate({ productId: item.productId, quantity: item.quantity - 1 })} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 text-lg font-bold">-</button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button onClick={() => updateQty.mutate({ productId: item.productId, quantity: item.quantity + 1 })} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 text-lg font-bold">+</button>
              </div>
              <p className="font-semibold text-sm w-24 text-right">{formatPrice(Number(item.product[priceKey]) * item.quantity)}</p>
              <button onClick={() => removeItem.mutate({ productId: item.productId })} className="p-2 text-zinc-500 hover:text-red-400 text-sm">Eliminar</button>
            </div>
          ))}
        </div>

        {/* Checkout panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit sticky top-24">
          <h3 className="font-semibold text-lg mb-4">Resumen</h3>

          {/* Payment selector */}
          <div className="mb-4">
            <p className="text-sm text-zinc-400 mb-2">Forma de pago</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentType("efectivo")} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${paymentType === "efectivo" ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>Efectivo -30%</button>
              <button onClick={() => setPaymentType("transferencia")} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${paymentType === "transferencia" ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>Transfer -25%</button>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between text-zinc-400"><span>Precio lista</span><span className="line-through">{formatPrice(totalList)}</span></div>
            <div className="flex justify-between text-zinc-400"><span>Tu descuento ({paymentType === "efectivo" ? "30%" : "25%"})</span><span className="text-green-400">-{formatPrice(savings)}</span></div>
            <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-lg"><span>Total</span><span className="text-yellow-500">{formatPrice(total)}</span></div>
            <div className="text-xs text-green-400 font-medium bg-green-500/10 rounded px-2 py-1 text-center">
              Tu ganancia: +{formatPrice(totalProfit)} ({totalList > 0 ? Math.round((totalProfit / totalList) * 100) : 0}%)
            </div>
          </div>

          {/* Notes */}
          <Textarea placeholder="Notas adicionales (opcional)" value={notes} onChange={e => setNotes(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white text-sm mb-4" />

          {/* Single CTA button */}
          <Button
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-6 text-lg"
            onClick={handleOrder}
            disabled={createOrder.isPending || items.length === 0}
          >
            {createOrder.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FileText className="w-5 h-5 mr-2" />}
            {createOrder.isPending ? "Generando..." : "Generar Pedido"}
          </Button>
          <p className="text-zinc-500 text-xs text-center mt-2">Se descargara el PDF con tu ganancia detallada</p>
        </div>
      </div>
    </div>
  );
}
