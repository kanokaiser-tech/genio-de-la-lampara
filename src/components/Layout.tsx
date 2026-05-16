import { Outlet, Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, ClipboardList, Settings, LogOut, Menu, X, Lamp } from "lucide-react";
import { useState } from "react";

export default function Layout() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isLogin = location.pathname === "/login";

  const links = isAdmin
    ? [
        { to: "/admin", label: "Panel Admin", icon: Settings },
        { to: "/productos", label: "Productos", icon: Package },
        { to: "/pedido", label: "Pedidos", icon: ShoppingCart },
        { to: "/mis-pedidos", label: "Mis Pedidos", icon: ClipboardList },
      ]
    : [
        { to: "/productos", label: "Productos", icon: Package },
        { to: "/pedido", label: "Mi Pedido", icon: ShoppingCart },
        { to: "/mis-pedidos", label: "Mis Pedidos", icon: ClipboardList },
      ];

  if (isLogin) return <Outlet />;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Desktop nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 z-50 items-center px-6 justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Lamp className="w-6 h-6 text-yellow-500" />
          <span className="font-bold text-lg text-yellow-500">Genio de la Lampara</span>
        </Link>
        <div className="flex items-center gap-1">
          {isAuthenticated ? (
            <>
              {links.map((l) => (
                <Link key={l.to} to={l.to} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${location.pathname === l.to ? "bg-yellow-500/10 text-yellow-500" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
                  <l.icon className="w-4 h-4" /> {l.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-zinc-800">
                <span className="text-sm text-zinc-400">{user?.name}</span>
                <Button variant="ghost" size="sm" onClick={logout} className="text-zinc-400 hover:text-red-400"><LogOut className="w-4 h-4" /></Button>
              </div>
            </>
          ) : (
            <Link to="/login"><Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold" size="sm">Ingresar</Button></Link>
          )}
        </div>
      </nav>

      {/* Mobile nav */}
      <nav className="md:hidden fixed top-0 left-0 right-0 h-14 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 z-50 flex items-center px-4 justify-between">
        <Link to="/" className="flex items-center gap-2"><Lamp className="w-5 h-5 text-yellow-500" /><span className="font-bold text-sm text-yellow-500">Genio de la Lampara</span></Link>
        {isAuthenticated && <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-zinc-400">{menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>}
      </nav>

      {menuOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 bg-zinc-900 border-b border-zinc-800 z-40 p-4 space-y-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${location.pathname === l.to ? "bg-yellow-500/10 text-yellow-500" : "text-zinc-400"}`}>
              <l.icon className="w-4 h-4" /> {l.label}
            </Link>
          ))}
          <button onClick={() => { setMenuOpen(false); logout(); }} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-red-400 w-full"><LogOut className="w-4 h-4" /> Salir</button>
        </div>
      )}

      <div className="h-16" />
      <main className="container mx-auto px-4 py-6 pb-24"><Outlet /></main>
    </div>
  );
}
