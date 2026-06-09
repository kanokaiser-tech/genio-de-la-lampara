import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { ProductCarousel } from "@/components/ProductCarousel";
import {
  Package, ShoppingCart, MessageCircle, Percent, Lamp, ArrowRight,
  Sparkles, Zap, Heart
} from "lucide-react";

export default function Home() {
  const { isAuthenticated, isAdmin } = useAuth();

  // Queries para secciones (solo se ejecutan si está autenticado)
  const { data: featured } = trpc.product.featured.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: newArrivals } = trpc.product.newArrivals.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: recommendations } = trpc.product.recommendations.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="text-center py-16 md:py-24">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-yellow-500/20">
          <Percent className="w-4 h-4" /> Descuentos exclusivos para revendedores
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6">Catalogo exclusivo para <span className="text-yellow-500">revendedores</span></h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">Arma tu pedido con precios exclusivos. Efectivo 30% off o transferencia 25% off.</p>
        {isAuthenticated ? (
          <Link to={isAdmin ? "/admin" : "/productos"}>
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-6 text-lg rounded-xl">Ir al catalogo <ArrowRight className="w-5 h-5 ml-2" /></Button>
          </Link>
        ) : (
          <Link to="/login">
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 py-6 text-lg rounded-xl">Ingresar <ArrowRight className="w-5 h-5 ml-2" /></Button>
          </Link>
        )}
      </section>

      {/* Secciones de productos (solo para usuarios logueados) */}
      {isAuthenticated && (
        <section className="py-8 border-t border-zinc-800">
          <div className="max-w-6xl mx-auto px-4">
            {/* Ofertas de la semana */}
            <ProductCarousel
              title="Ofertas de la semana"
              subtitle="Seleccionadas por nuestro equipo"
              products={featured as any}
              badge="TOP"
              emptyMessage="No hay ofertas destacadas esta semana"
            />

            {/* Novedades */}
            <ProductCarousel
              title="Novedades"
              subtitle="Lo ultimo que llego al catalogo"
              products={newArrivals as any}
              badge="NUEVO"
            />

            {/* Recomendados para vos */}
            <ProductCarousel
              title="Recomendados para vos"
              subtitle="Basado en tus compras y vistas"
              products={recommendations as any}
              badge="PARA VOS"
            />

            {/* Ver todo */}
            <div className="text-center mt-6">
              <Link to="/productos">
                <Button variant="outline" className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 px-8">
                  Ver todo el catalogo <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
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
