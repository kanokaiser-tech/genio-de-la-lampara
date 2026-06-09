import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2 } from "lucide-react";

export default function MyVendorProductsPage() {
  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.vendorProducts.myProducts.useQuery();
  
  const deleteProduct = trpc.vendorProducts.delete.useMutation({
    onSuccess: () => {
      utils.vendorProducts.myProducts.invalidate();
      alert("Producto eliminado");
    },
    onError: (err) => alert("Error: " + err.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!products || (products as any[]).length === 0) {
    return <div className="text-center py-20 text-gray-500">No publicaste ningún producto aún.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mis Publicaciones</h1>
      
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
              <Button onClick={() => {
                if (confirm(`¿Eliminar "${product.title}"?`)) {
                  deleteProduct.mutate({ id: product.id });
                }
              }} variant="outline" className="mt-4 border-red-300 text-red-600">
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
