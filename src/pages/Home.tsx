import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, MessageCircle, Percent, Lamp, ArrowRight } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isAdmin } = useAuth();
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <section className="text-center py-16 md:py-24">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-yellow-500/20">
          <Percent className="w-4 h-4" /> Descuentos exclusivos para revendedores
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6">Catalogo exclusivo para <span className="text-yellow-500">revendedores</span></h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">Arma tu pedido con precios exclusivos. Efectivo 30% off o transferencia 25% off.</p>
        {isAuthenticated ? (
          <Link to={isAdmin ? "/admin" : "/productos"}>
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-6 text-lg rounded-xl">Ir al panel <ArrowRight className="w-5 h-5 ml-2" /></Button>
          </Link>
        ) : (
          <Link to="/login">
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-6 text-lg rounded-xl">Ingresar <ArrowRight className="w-5 h-5 ml-2" /></Button>
          </Link>
        )}
      </section>
      <section className="py-12 border-t border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Package, title: "Lista de precios", desc: "Todos los productos ordenados por categoria con precios exclusivos." },
            { icon: ShoppingCart, title: "Arma tu pedido", desc: "Selecciona productos y arma tu carrito con descuentos automaticos." },
            { icon: MessageCircle, title: "Pedido por WhatsApp", desc: "Genera un PDF con tu pedido y envialo directamente." },
            { icon: Percent, title: "30% o 25% de descuento", desc: "30% off en efectivo o 25% off por transferencia en todo el catalogo." },
          ].map((f) => (
            <div key={f.title} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-yellow-500/30 transition-all">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4"><f.icon className="w-6 h-6 text-yellow-500" /></div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t border-zinc-800 py-8 text-center text-zinc-500 text-sm">
        <div className="flex items-center justify-center gap-2"><Lamp className="w-4 h-4 text-yellow-500" /> &copy; 2025 Genio de la Lampara</div>
      </footer>
    </div>
  );
}
