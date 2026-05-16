import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/const";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, MessageCircle, Percent, Lamp, ArrowRight } from "lucide-react";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: Package,
      title: "Lista de precios",
      desc: "Todos los productos en formato lista, ordenados por categoria con precios exclusivos para revendedores.",
    },
    {
      icon: ShoppingCart,
      title: "Arma tu pedido",
      desc: "Selecciona productos, define cantidades y arma tu carrito facilmente con descuentos automaticos.",
    },
    {
      icon: MessageCircle,
      title: "Pedido por WhatsApp",
      desc: "Genera un PDF con tu pedido y envialo directamente por WhatsApp a tu administrador.",
    },
    {
      icon: Percent,
      title: "30% o 25% de descuento",
      desc: "Precios exclusivos: 30% off en efectivo o 25% off por transferencia en todo el catalogo.",
    },
  ];

  const handleEnter = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (user?.role === ROLES.REVENDEDOR) navigate("/productos");
    else if (user?.role === ROLES.ADMIN) navigate("/admin");
    else if (user?.role === ROLES.SUPERADMIN) navigate("/superadmin");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="text-center py-16 md:py-24">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-yellow-500/20">
          <Percent className="w-4 h-4" />
          Descuentos exclusivos para revendedores
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Catalogo exclusivo para
          <br />
          <span className="text-yellow-500">revendedores</span>
        </h1>

        <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Arma tu pedido desde la lista de precios, genera un PDF automaticamente
          y envialo por WhatsApp. Elegi tu forma de pago: efectivo con 30% de
          descuento o transferencia con 25%.
        </p>

        <Button
          onClick={handleEnter}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-6 text-lg rounded-xl"
        >
          {isAuthenticated ? "Ir al panel" : "Ingresar como revendedor"}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </section>

      {/* Features */}
      <section className="py-12 border-t border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-yellow-500/30 transition-all"
            >
              <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-yellow-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 mt-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Lamp className="w-4 h-4 text-yellow-500" />
          <span className="text-zinc-500 text-sm">
            &copy; 2025 Genio de la Lampara. Todos los derechos reservados.
          </span>
        </div>
      </footer>
    </div>
  );
}
