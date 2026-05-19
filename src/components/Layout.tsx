import { Outlet, Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Package, ShoppingCart, ClipboardList, Settings, LogOut, Menu, X, Lamp, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/providers/trpc";

export default function Layout() {
  const { user, isAuthenticated, isAdmin, isSuperadmin, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passDialogOpen, setPassDialogOpen] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState(false);
  const isLogin = location.pathname === "/login";

  const changeMyPassword = trpc.auth.changeMyPassword.useMutation({
    onSuccess: () => {
      setPassSuccess(true);
      setCurrentPass("");
      setNewPass("");
      setPassError("");
      setTimeout(() => { setPassDialogOpen(false); setPassSuccess(false); }, 2000);
    },
    onError: (err) => setPassError(err.message),
  });

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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Desktop nav - barra azul */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-blue-600 z-50 items-center px-6 justify-between shadow-md">
        <Link to="/" className="flex items-center gap-2">
          <Lamp className="w-6 h-6 text-white" />
          <span className="font-bold text-lg text-white">Genio de la Lampara</span>
        </Link>
        <div className="flex items-center gap-1">
          {isAuthenticated ? (
            <>
              {links.map((l) => (
                <Link key={l.to} to={l.to} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === l.to ? "bg-white/20 text-white" : "text-blue-100 hover:text-white hover:bg-white/10"}`}>
                  <l.icon className="w-4 h-4" /> {l.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-blue-400/50">
                {isSuperadmin && <span className="text-yellow-300 text-xs font-bold">SUPER</span>}
                <span className="text-sm text-blue-100">{user?.name}</span>

                {/* Cambiar contrasena */}
                <Dialog open={passDialogOpen} onOpenChange={setPassDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="p-2 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Cambiar contrasena">
                      <KeyRound className="w-4 h-4" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-gray-200">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900 flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-blue-600" /> Cambiar Contrasena
                      </DialogTitle>
                    </DialogHeader>
                    {passSuccess ? (
                      <div className="py-6 text-center">
                        <p className="text-green-600 font-medium">Contrasena cambiada exitosamente!</p>
                      </div>
                    ) : (
                      <form onSubmit={(e) => { e.preventDefault(); setPassError(""); changeMyPassword.mutate({ currentPassword: currentPass, newPassword: newPass }); }} className="space-y-3 pt-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Contrasena actual</label>
                          <Input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900" required />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Nueva contrasena (min 4 caracteres)</label>
                          <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900" required minLength={4} />
                        </div>
                        {passError && <p className="text-red-500 text-sm">{passError}</p>}
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={changeMyPassword.isPending}>
                          {changeMyPassword.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cambiar contrasena"}
                        </Button>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>

                <Button variant="ghost" size="sm" onClick={logout} className="text-blue-100 hover:text-white hover:bg-white/10"><LogOut className="w-4 h-4" /></Button>
              </div>
            </>
          ) : (
            <Link to="/login"><Button className="bg-white text-blue-600 hover:bg-blue-50 font-semibold" size="sm">Ingresar</Button></Link>
          )}
        </div>
      </nav>

      {/* Mobile nav */}
      <nav className="md:hidden fixed top-0 left-0 right-0 h-14 bg-blue-600 z-50 flex items-center px-4 justify-between shadow-md">
        <Link to="/" className="flex items-center gap-2"><Lamp className="w-5 h-5 text-white" /><span className="font-bold text-sm text-white">Genio de la Lampara</span></Link>
        {isAuthenticated && <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-white">{menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>}
      </nav>

      {menuOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 bg-white border-b border-gray-200 z-40 p-4 space-y-1 shadow-lg">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${location.pathname === l.to ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-600"}`}>
              <l.icon className="w-4 h-4" /> {l.label}
            </Link>
          ))}
          <button onClick={() => { setPassDialogOpen(true); setMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-gray-600 w-full">
            <KeyRound className="w-4 h-4" /> Cambiar Contrasena
          </button>
          <button onClick={() => { setMenuOpen(false); logout(); }} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-red-500 w-full"><LogOut className="w-4 h-4" /> Salir</button>
        </div>
      )}

      <div className="h-16" />
      <main className="container mx-auto px-4 py-6 pb-24"><Outlet /></main>
    </div>
  );
}
