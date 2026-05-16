import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, FileText, MessageCircle, Loader2 } from "lucide-react";
import { Link } from "react-router";
import jsPDF from "jspdf";

export default function CartPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [paymentType, setPaymentType] = useState<"efectivo" | "transferencia">((user?.discountType as "efectivo" | "transferencia") ?? "efectivo");
  const [notes, setNotes] = useState("");
  const { data: cart, isLoading } = trpc.cart.get.useQuery();
  const { data: admin } = trpc.user.myAdmin.useQuery();
  const updateQty = trpc.cart.updateQuantity.useMutation({ onSuccess: () => utils.cart.get.invalidate() });
  const removeItem = trpc.cart.remove.useMutation({ onSuccess: () => utils.cart.get.invalidate() });
  const clearCart = trpc.cart.clear.useMutation({ onSuccess: () => utils.cart.get.invalidate() });
  const createOrder = trpc.order.create.useMutation({ onSuccess: () => { utils.cart.get.invalidate(); utils.order.myOrders.invalidate(); } });

  const priceField: "products.priceCash30" | "products.priceTransfer25" = paymentType === "efectivo" ? "products.priceCash30" : "products.priceTransfer25";

  const items = cart?.map(c => ({ ...c.cartItems, product: c.products })) ?? [];
  const total = items.reduce((s, i) => s + Number(i.product[priceField.split(".")[1] as "priceCash30" | "priceTransfer25"]) * i.quantity, 0);
  const totalList = items.reduce((s, i) => s + Number(i.product.priceList) * i.quantity, 0);
  const savings = totalList - total;

  const genPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Genio de la Lampara - Pedido", 14, 20);
    doc.setFontSize(10); doc.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, 14, 30); doc.text(`Revendedor: ${user?.name ?? ""}`, 14, 36); doc.text(`Pago: ${paymentType === "efectivo" ? "Efectivo (30% off)" : "Transferencia (25% off)"}`, 14, 42); if (notes) doc.text(`Notas: ${notes}`, 14, 48);
    let y = 58;
    doc.setFontSize(10); doc.text("Producto", 14, y); doc.text("Cant.", 120, y); doc.text("P.Unit", 140, y); doc.text("Subtotal", 170, y); doc.line(14, y + 2, 196, y + 2);
    y += 10; doc.setFontSize(9);
    items.forEach(item => {
      const price = Number(item.product[priceField.split(".")[1] as "priceCash30" | "priceTransfer25"]);
      doc.text(item.product.name.substring(0, 55), 14, y); doc.text(String(item.quantity), 125, y); doc.text(`$${price.toLocaleString("es-AR")}`, 140, y); doc.text(`$${(price * item.quantity).toLocaleString("es-AR")}`, 170, y); y += 7;
    });
    doc.line(14, y + 2, 196, y + 2); y += 10; doc.setFontSize(12); doc.text(`TOTAL: $${total.toLocaleString("es-AR")}`, 14, y);
    doc.save(`pedido-${Date.now()}.pdf`);
  };

  const sendWA = () => {
    if (!admin?.phone) return;
    let msg = `*Pedido - Genio de la Lampara*%0A%0A*Revendedor:* ${user?.name}%0A*Pago:* ${paymentType === "efectivo" ? "Efectivo (30% off)" : "Transferencia (25% off)"}%0A%0A*Productos:*%0A`;
    items.forEach((item, i) => { const price = Number(item.product[priceField.split(".")[1] as "priceCash30" | "priceTransfer25"]); msg += `${i + 1}. ${item.product.name}%0A   ${item.quantity}x $${price.toLocaleString("es-AR")} = $${(price * item.quantity).toLocaleString("es-AR")}%0A`; });
    msg += `%0A*TOTAL: $${total.toLocaleString("es-AR")}*`; if (notes) msg += `%0A%0ANotas: ${notes}`;
    window.open(`https://wa.me/${admin.phone}?text=${msg}`, "_blank");
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-yellow-500 animate-spin" /></div>;
  if (items.length === 0) return (
    <div className="max-w-xl mx-auto text-center py-20"><ShoppingCart className="w-16 h-16 text-zinc-600 mx-auto mb-6" /><h2 className="text-2xl font-bold mb-2">Tu pedido esta vacio</h2><p className="text-zinc-400 mb-6">Agrega productos para armar tu pedido.</p><Link to="/productos"><Button className="bg-yellow-500 hover:bg-yellow-600 text-black"><ArrowLeft className="w-4 h-4 mr-2" /> Ver productos</Button></Link></div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6"><Link to="/productos" className="text-zinc-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link><h1 className="text-2xl font-bold">Tu Pedido</h1></div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{item.product.name}</p><p className="text-yellow-500 font-semibold text-sm mt-1">{formatPrice(item.product[priceField.split(".")[1] as "priceCash30" | "priceTransfer25"])} c/u</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty.mutate({ productId: item.productId, quantity: item.quantity - 1 })} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700"><Minus className="w-3 h-3" /></button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button onClick={() => updateQty.mutate({ productId: item.productId, quantity: item.quantity + 1 })} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700"><Plus className="w-3 h-3" /></button>
              </div>
              <p className="font-semibold text-sm w-24 text-right">{formatPrice(Number(item.product[priceField.split(".")[1] as "priceCash30" | "priceTransfer25"]) * item.quantity)}</p>
              <button onClick={() => removeItem.mutate({ productId: item.productId })} className="p-2 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => clearCart.mutate()} className="text-zinc-500 hover:text-red-400"><Trash2 className="w-3 h-3 mr-2" /> Vaciar</Button>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit sticky top-24">
          <h3 className="font-semibold text-lg mb-4">Resumen</h3>
          <div className="mb-4">
            <p className="text-sm text-zinc-400 mb-2">Forma de pago</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentType("efectivo")} className={`px-3 py-2 rounded-lg text-sm font-medium ${paymentType === "efectivo" ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400"}`}>Efectivo -30%</button>
              <button onClick={() => setPaymentType("transferencia")} className={`px-3 py-2 rounded-lg text-sm font-medium ${paymentType === "transferencia" ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400"}`}>Transfer -25%</button>
            </div>
          </div>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between text-zinc-400"><span>Precio lista</span><span className="line-through">{formatPrice(totalList)}</span></div>
            <div className="flex justify-between text-zinc-400"><span>Descuento</span><span className="text-green-400">-{formatPrice(savings)}</span></div>
            <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-lg"><span>Total</span><span className="text-yellow-500">{formatPrice(total)}</span></div>
          </div>
          <Textarea placeholder="Notas (opcional)" value={notes} onChange={e => setNotes(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white text-sm mb-4" />
          <div className="space-y-2">
            <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={() => createOrder.mutate({ paymentType, notes: notes || undefined })} disabled={createOrder.isPending}><ShoppingCart className="w-4 h-4 mr-2" /> Confirmar pedido</Button>
            <Button variant="outline" className="w-full border-zinc-700" onClick={genPDF}><FileText className="w-4 h-4 mr-2" /> Descargar PDF</Button>
            <Button variant="outline" className="w-full border-green-600 text-green-500" onClick={sendWA} disabled={!admin?.phone}><MessageCircle className="w-4 h-4 mr-2" /> Enviar por WhatsApp</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
