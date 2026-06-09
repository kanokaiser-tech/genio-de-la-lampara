import { Link, useLocation } from "react-router";
import { Home, Package, ShoppingBag, User, Store, Flame, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function BottomNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const navItems = [
    { path: "/", icon: Home, label: "Inicio" },
    { path: "/productos", icon: Package, label: "Catálogo" },
    { path: "/marketplace", icon: Store, label: "Market", highlight: true },
    { path: "/mis-pedidos", icon: ShoppingBag, label: "Pedidos" },
    { path: "/perfil", icon: LayoutGrid, label: "Más" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-50 safe-bottom md:hidden">
      <div className="flex items-center justify-around max-w-lg mx-auto px-1 py-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/perfil" && ["/perfil", "/monedas", "/publicar", "/mis-publicaciones"].some(p => location.pathname.startsWith(p)));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center min-w-0 flex-1 py-1 rounded-lg transition-all duration-200 ${
                isActive 
                  ? "text-blue-600" 
                  : item.highlight
                  ? "text-red-500 hover:text-red-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.highlight ? (
                <div className="relative">
                  <Store className="w-5 h-5" />
                  <Flame className="w-3 h-3 absolute -top-1 -right-2 text-orange-500 fire-icon" />
                </div>
              ) : (
                <item.icon className={`w-5 h-5 ${isActive ? "text-blue-600" : ""}`} />
              )}
              <span className={`text-[10px] font-medium mt-0.5 truncate max-w-[60px] ${
                item.highlight ? "text-red-500 font-bold" : isActive ? "text-blue-600" : "text-gray-500"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
