import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminVendorProductsPage() {
  const { isAdmin, isSuperadmin } = useAuth();
  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.vendorProducts.adminList.useQuery();
  
  const approve = trpc.vendorProducts.approve.useMutation({
    onSuccess: () => {
      utils.vendorProducts.adminList.invalidate();
      utils.vendorProducts.list.invalidate();
      alert("Producto aprobado");
    },
    onError: (err) => alert("Error: " + err.message),
  });
  
  const reject = trpc.vendorProducts.reject.useMutation({
    onSuccess: () => {
      utils.vendorProducts.adminList.invalidate();
      utils.vendorProducts.list.invalidate();
      alert("Producto rechazado");
    },
    onError: (err) => alert("Error: " + err.message),
  });

  const deleteProduct = trpc.vendorProducts.delete.useMutation({
    onSuccess: () => {
      utils.vendorProducts.adminList.invalidate();
      utils.vendorProducts.list.invalidate();
      utils.vendorProducts.myProducts.invalidate();
      alert("Producto eliminado");
    },
    onError: (err) => alert("Error: " + err.message),
  });

  if (!isAdmin && !isSuperadmin) {
    return <div className="text-center py-20 text-red-500">No tenés permisos para ver esta página.</div>;
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!products || (products as any[]).length === 0) {
    return <div className="text-center py-20 text-gray-500">No hay productos pendientes o publicados.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Productos del Marketplace</h1>
      {isSuperadmin && (
        <p className="text-sm text-purple-600 mb-4">✨ Superadmin: podés aprobar, rechazar y eliminar productos</p>
      )}
      
      <div className="space-y-4">
        {(products as any[]).map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{product.title}</span>
                <Badge className={
                  product.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  product.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }>
                  {product.status === 'pending' ? 'Pendiente' :
                   product.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">{product.description || "Sin descripción"}</p>
              <p className="font-bold text-blue-600">${Number(product.price).toLocaleString()}</p>
              <p className="text-sm text-gray-500">Revendedor ID: {product.user_id}</p>
              <div className="flex gap-2 mt-4">
                {product.status === 'pending' && (
                  <>
                    <Button onClick={() => approve.mutate({ id: product.id })} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                    </Button>
                    <Button onClick={() => reject.mutate({ id: product.id })} variant="outline" className="border-red-300 text-red-600">
                      <XCircle className="w-4 h-4 mr-1" /> Rechazar
                    </Button>
                  </>
                )}
                <Button onClick={() => {
                  if (confirm(`¿Eliminar "${product.title}"?`)) {
                    deleteProduct.mutate({ id: product.id });
                  }
                }} variant="outline" className="border-red-300 text-red-600">
                  <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
