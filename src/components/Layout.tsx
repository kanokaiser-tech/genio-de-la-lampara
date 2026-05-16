import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/const";
import { Button } from "@/components/ui/button";
import {
  Package,
  ShoppingCart,
  ClipboardList,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Lamp,
} from "lucide-react";
import { useState } from "react";

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLoginPage = location.pathname === "/login";

  const revendedorLinks = [
    { to: "/productos", label: "Productos", icon: Package },
    { to: "/pedido", label: "Mi Pedido", icon: ShoppingCart },
    { to: "/mis-pedidos", label: "Mis Pedidos", icon: ClipboardList },
  ];

  const adminLinks = [
    { to: "/admin", label: "Panel Admin", icon: Settings },
    { to: "/productos", label: "Productos", icon: Package },
  ];

  const superadminLinks = [
    { to: "/superadmin", label: "Super Admin", icon: Shield },
    { to: "/admin", label: "Panel Admin", icon: Settings },
    { to: "/productos", label: "Productos", icon: Package },
  ];

  let navLinks: { to: string; label: string; icon: React.ElementType }[] = [];
  if (user?.role === ROLES.REVENDEDOR) navLinks = revendedorLinks;
  else if (user?.role === ROLES.ADMIN) navLinks = adminLinks;
  else if (user?.role === ROLES.SUPERADMIN) navLinks = superadminLinks;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {!isLoginPage && (
        <>
          {/* Desktop Nav */}
          <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 z-50 items-center px-6 justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Lamp className="w-6 h-6 text-yellow-500" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-yellow-500">Genio de la Lampara</span>
                {isAuthenticated && (
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                    Revendedores
                  </span>
                )}
              </div>
            </Link>

            <div className="flex items-center gap-1">
              {isAuthenticated ? (
                <>
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        location.pathname === link.to
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                    >
                      <link.icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  ))}
                  <div className="flex items-center gap-3 ml-4 pl-4 border-l border-zinc-800">
                    <span className="text-sm text-zinc-400">{user?.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={logout}
                      className="text-zinc-400 hover:text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  onClick={() => navigate("/login")}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  size="sm"
                >
                  Ingresar
                </Button>
              )}
            </div>
          </nav>

          {/* Mobile Nav */}
          <nav className="md:hidden fixed top-0 left-0 right-0 h-14 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 z-50 flex items-center px-4 justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Lamp className="w-5 h-5 text-yellow-500" />
              <span className="font-bold text-sm text-yellow-500">Genio de la Lampara</span>
            </Link>
            {isAuthenticated ? (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-zinc-400"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            ) : (
              <Button
                onClick={() => navigate("/login")}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-xs"
                size="sm"
              >
                Ingresar
              </Button>
            )}
          </nav>

          {/* Mobile Menu */}
          {mobileMenuOpen && isAuthenticated && (
            <div className="md:hidden fixed top-14 left-0 right-0 bg-zinc-900 border-b border-zinc-800 z-40 p-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                    location.pathname === link.to
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "text-zinc-400"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-red-400 w-full"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          )}

          {/* Spacer */}
          <div className="h-16 md:h-16" />
        </>
      )}

      <main className={isLoginPage ? "" : "container mx-auto px-4 py-6 pb-24"}>
        <Outlet />
      </main>
    </div>
  );
}
