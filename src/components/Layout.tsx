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
import { 
  Package, ShoppingCart, ClipboardList, Settings, LogOut, Menu, X, 
  Lamp, KeyRound, Loader2, Coins, Store, Home, User, Truck, Shield,
  ChevronDown
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { BottomNav } from "./BottomNav";

export default function Layout() {
  const { user, isAuthenticated, isAdmin, isSuperadmin, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [passDialogOpen, setPassDialogOpen] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  const changePass = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setPassSuccess("Contraseña cambiada correctamente");
      setTimeout(() => {
        setPassDialogOpen(false);
        setPassSuccess("");
        setPassError("");
        setOldPass("");
        setNewPass("");
        setConfirmPass("");
      }, 2000);
    },
    onError: (err) => setPassError(err.message),
  });

  const isLogin = location.pathname === "/login";

  // Links para desktop - solo usuario
  const desktopLinks = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/productos", label: "Productos", icon: Package },
    { to: "/mis-pedidos", label: "Pedidos", icon: ClipboardList },
    { to: "/monedas", label: "Monedas", icon: Coins },
    { to: "/marketplace", label: "Marketplace 🔥", icon: Store, highlight: true },
  ];

  // Links exclusivos de admin (van en dropdown)
  const adminLinks = [
    { to: "/admin", label: "Panel Admin", icon: Settings },
    { to: "/delivery", label: "Reparto", icon: Truck },
    { to: "/admin/vendor-products", label: "Aprobar", icon: Shield },
  ];

  // Links para menú móvil - usuario
  const mobileLinks = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/productos", label: "Productos", icon: Package },
    { to: "/pedido", label: "Carrito", icon: ShoppingCart },
    { to: "/mis-pedidos", label: "Pedidos", icon: ClipboardList },
    { to: "/monedas", label: "Monedas", icon: Coins },
    { to: "/marketplace", label: "Marketplace 🔥", icon: Store, highlight: true },
    { to: "/perfil", label: "Perfil", icon: User },
  ];

  // Links de admin para menú móvil (separados)
  const mobileAdminLinks = (isAdmin || isSuperadmin)
    ? [
        { to: "/admin", label: "Panel Admin", icon: Settings },
        { to: "/delivery", label: "Reparto", icon: Truck },
        { to: "/admin/vendor-products", label: "Aprobar", icon: Shield },
      ]
    : [];

  if (isLogin) return <Outlet />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Desktop nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-600 to-blue-700 z-50 items-center px-6 justify-between shadow-lg">
        <Link to="/" className="flex items-center gap-2">
          <Lamp className="w-6 h-6 text-white" />
          <span className="font-bold text-lg text-white">Genio</span>
        </Link>
        
        <div className="flex items-center gap-1">
          {desktopLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                l.highlight
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : location.pathname === l.to
                  ? "bg-white/20 text-white"
                  : "text-white/90 hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          ))}

          {/* Dropdown Admin */}
          {(isAdmin || isSuperadmin) && (
            <div className="relative">
              <button
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                onBlur={() => setTimeout(() => setAdminMenuOpen(false), 150)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  adminLinks.some(l => location.pathname === l.to)
                    ? "bg-white/20 text-white"
                    : "text-white/90 hover:bg-white/10"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="hidden lg:inline">Admin</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${adminMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {adminMenuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[180px] z-50">
                  {adminLinks.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setAdminMenuOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                        location.pathname === l.to
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <l.icon className="w-4 h-4" />
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0) || "U"}
                  </span>
                </div>
                <span className="text-white text-sm hidden lg:inline">{user?.name}</span>
              </div>
              <Button variant="ghost" className="text-white hover:bg-white/20" onClick={logout}>
                <LogOut className="w-4 h-4 mr-1" /> Salir
              </Button>
              <Dialog open={passDialogOpen} onOpenChange={setPassDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-white hover:bg-white/20">
                    <KeyRound className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Cambiar Contraseña</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input type="password" placeholder="Contraseña actual" value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
                    <Input type="password" placeholder="Nueva contraseña" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                    <Input type="password" placeholder="Confirmar" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
                    {passError && <p className="text-red-500 text-sm">{passError}</p>}
                    {passSuccess && <p className="text-green-500 text-sm">{passSuccess}</p>}
                    <Button onClick={() => changePass.mutate({ oldPassword: oldPass, newPassword: newPass, confirmPassword: confirmPass })} disabled={changePass.isPending}>
                      {changePass.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cambiar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Link to="/login"><Button className="bg-white text-blue-600">Ingresar</Button></Link>
          )}
        </div>
      </nav>

      {/* Mobile nav - header */}
      <nav className="md:hidden fixed top-0 left-0 right-0 h-14 bg-gradient-to-r from-blue-600 to-blue-700 z-50 flex items-center px-4 justify-between shadow-lg">
        <Link to="/" className="flex items-center gap-2">
          <Lamp className="w-5 h-5 text-white" />
          <span className="font-bold text-sm text-white">Genio</span>
        </Link>
        
        {isAuthenticated && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {user?.name?.charAt(0) || "U"}
              </span>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-white">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        )}
      </nav>

      {/* Menú móvil */}
      {menuOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 bg-white z-40 p-4 shadow-lg max-h-[80vh] overflow-y-auto">
          {/* Links de usuario */}
          <div className="space-y-1">
            {mobileLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                  l.highlight
                    ? "bg-red-50 text-red-600 font-medium border border-red-200"
                    : location.pathname === l.to
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <l.icon className="w-4 h-4" />
                {l.label}
                {l.highlight && (
                  <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">🔥</span>
                )}
              </Link>
            ))}
          </div>

          {/* Links de admin - separados */}
          {mobileAdminLinks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Admin</p>
              <div className="space-y-1">
                {mobileAdminLinks.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                      location.pathname === l.to
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <l.icon className="w-4 h-4" />
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              logout();
              setMenuOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 w-full mt-3 pt-3 border-t border-gray-200"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      )}

      <div className="h-14 md:h-16"></div>

      <main className="px-4 py-4">
        <Outlet />
      </main>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
