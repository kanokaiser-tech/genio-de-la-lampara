import { useState, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, ArrowLeft, FileText, Loader2 } from "lucide-react";
import { Link } from "react-router";
import jsPDF from "jspdf";

export default function CartPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [paymentType, setPaymentType] = useState<"efectivo" | "transferencia">((user?.discountType as "efectivo" | "transferencia") ?? "efectivo");
  const [notes, setNotes] = useState("");
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const orderItemsRef = useRef<{ productName: string; quantity: number; price: number; subtotal: number }[]>([]);

  const { data: cart, isLoading } = trpc.cart.get.useQuery();
  const updateQty = trpc.cart.updateQuantity.useMutation({ onSuccess: () => utils.cart.get.invalidate() });
  const removeItem = trpc.cart.remove.useMutation({ onSuccess: () => utils.cart.get.invalidate() });
  const createOrder = trpc.order.create.useMutation({
    onSuccess: () => {
      utils.cart.get.invalidate();
      utils.order.myOrders.invalidate();
    },
  });

  const priceField: "products.priceCash30" | "products.priceTransfer25" = paymentType === "efectivo" ? "products.priceCash30" : "products.priceTransfer25";

  const items = cart?.map(c => ({ ...c.cartItems, product: c.products })) ?? [];
  const total = items.reduce((s, i) => s + Number(i.product[priceField.split(".")[1] as "priceCash30" | "priceTransfer25"]) * i.quantity, 0);
  const totalList = items.reduce((s, i) => s + Number(i.product.priceList) * i.quantity, 0);
  const savings = totalList - total;

  const generatePDF = (orderItems: typeof orderItemsRef.current, finalTotal: number) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Genio de la Lampara - Pedido", 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, 14, 30);
    doc.text(`Revendedor: ${user?.name ?? ""}`, 14, 36);
    doc.text(`Pago: ${paymentType === "efectivo" ? "Efectivo (30% descuento)" : "Transferencia (25% descuento)"}`, 14, 42);
    if (notes) doc.text(`Notas: ${notes}`, 14, 48);

    let y = 58;
    doc.setFontSize(10);
    doc.text("Producto", 14, y);
    doc.text("Cant.", 120, y);
    doc.text("P.Unit", 145, y);
    doc.text("Subtotal", 175, y);
    doc.line(14, y + 2, 196, y + 2);
    y += 10;
    doc.setFontSize(9);

    orderItems.forEach(item => {
      doc.text(item.productName.substring(0, 55), 14, y);
      doc.text(String(item.quantity), 125, y);
      doc.text(`$${item.price.toLocaleString("es-AR")}`, 145, y);
      doc.text(`$${item.subtotal.toLocaleString("es-AR")}`, 175, y);
      y += 7;
    });

    doc.line(14, y + 2, 196, y + 2);
    y += 10;
    doc.setFontSize(12);
    doc.text(`TOTAL: $${finalTotal.toLocaleString("es-AR")}`, 14, y);

    doc.save(`pedido-genio-${Date.now()}.pdf`);
  };

  const handleOrder = () => {
    if (items.length === 0) return;

    // Prepare items for PDF
    const orderItems = items.map(item => {
      const price = Number(item.product[priceField.split(".")[1] as "priceCash30" | "priceTransfer25"]);
      return {
        productName: item.product.name,
        quantity: item.quantity,
        price,
        subtotal: price * item.quantity,
      };
    });
    orderItemsRef.current = orderItems;
    setOrderTotal(total);

    // Create order in backend
    createOrder.mutate(
      { paymentType, notes: notes || undefined },
      {
        onSuccess: () => {
          // Generate PDF after order is created
          setTimeout(() => {
            generatePDF(orderItems, total);
            setPdfGenerated(true);
          }, 300);
        },
      }
    );
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-yellow-500 animate-spin" /></div>;

  if (items.length === 0 && !pdfGenerated) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <ShoppingCart className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-2">Tu pedido esta vacio</h2>
        <p className="text-zinc-400 mb-6">Agrega productos para armar tu pedido.</p>
        <Link to="/productos"><Button className="bg-yellow-500 hover:bg-yellow-600 text-black"><ArrowLeft className="w-4 h-4 mr-2" /> Ver productos</Button></Link>
      </div>
    );
  }

  if (pdfGenerated) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Pedido generado!</h2>
        <p className="text-zinc-400 mb-2">El PDF se descargo automaticamente.</p>
        <p className="text-zinc-500 text-sm mb-6">Compartilo con tu administrador por WhatsApp o email.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/productos"><Button className="bg-yellow-500 hover:bg-yellow-600 text-black"><ArrowLeft className="w-4 h-4 mr-2" /> Seguir comprando</Button></Link>
          <Link to="/mis-pedidos"><Button variant="outline" className="border-zinc-700">Ver mis pedidos</Button></Link>
        </div>
      </div>
    );
  }

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
                <p className="text-yellow-500 font-semibold text-sm mt-1">{formatPrice(item.product[priceField.split(".")[1] as "priceCash30" | "priceTransfer25"])} c/u</p>
                <p className="text-xs text-zinc-500 line-through">Lista: {formatPrice(item.product.priceList)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty.mutate({ productId: item.productId, quantity: item.quantity - 1 })} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 text-lg font-bold">-</button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button onClick={() => updateQty.mutate({ productId: item.productId, quantity: item.quantity + 1 })} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 text-lg font-bold">+</button>
              </div>
              <p className="font-semibold text-sm w-24 text-right">{formatPrice(Number(item.product[priceField.split(".")[1] as "priceCash30" | "priceTransfer25"]) * item.quantity)}</p>
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
            <div className="text-xs text-green-400">Ahorro: {formatPrice(savings)}</div>
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
          <p className="text-zinc-500 text-xs text-center mt-2">Se descargara el PDF automaticamente</p>
        </div>
      </div>
    </div>
  );
}
