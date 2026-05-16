import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";
import Layout from "@/components/Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import OrdersPage from "./pages/OrdersPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

function Protected({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-zinc-950"><Spinner className="w-8 h-8 text-yellow-500" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/productos" element={<Protected><ProductsPage /></Protected>} />
        <Route path="/pedido" element={<Protected><CartPage /></Protected>} />
        <Route path="/mis-pedidos" element={<Protected><OrdersPage /></Protected>} />
        <Route path="/admin" element={<Protected adminOnly><AdminPage /></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
