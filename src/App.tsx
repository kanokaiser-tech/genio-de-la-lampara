import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/const";
import { Spinner } from "@/components/ui/spinner";

import Layout from "@/components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import OrdersPage from "./pages/OrdersPage";
import AdminPage from "./pages/AdminPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import NotFound from "./pages/NotFound";

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Spinner className="w-8 h-8 text-yellow-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role ?? "")) {
    // Redirect based on role
    if (user?.role === ROLES.REVENDEDOR) return <Navigate to="/productos" replace />;
    if (user?.role === ROLES.ADMIN) return <Navigate to="/admin" replace />;
    if (user?.role === ROLES.SUPERADMIN) return <Navigate to="/superadmin" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route
          path="/productos"
          element={
            <ProtectedRoute allowedRoles={[ROLES.REVENDEDOR, ROLES.ADMIN, ROLES.SUPERADMIN]}>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pedido"
          element={
            <ProtectedRoute allowedRoles={[ROLES.REVENDEDOR, ROLES.ADMIN, ROLES.SUPERADMIN]}>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-pedidos"
          element={
            <ProtectedRoute allowedRoles={[ROLES.REVENDEDOR, ROLES.ADMIN, ROLES.SUPERADMIN]}>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPERADMIN]}>
              <SuperAdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
