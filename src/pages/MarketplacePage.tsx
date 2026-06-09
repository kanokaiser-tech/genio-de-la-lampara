import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package, User, ExternalLink } from "lucide-react";

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const { data: products, isLoading } = trpc.vendorProducts.list.useQuery({ 
    search: search || undefined, 
    category: category || undefined 
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price);
  };

  const getImageUrl = (images: any) => {
    if (!images) return null;
    try {
      let urls;
      if (typeof images === 'string') {
        urls = JSON.parse(images);
      } else if (Array.isArray(images)) {
        urls = images;
      } else {
        return null;
      }
      return urls.length > 0 ? urls[0] : null;
    } catch (e) {
      console.error("Error parsing images:", e);
      return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Productos de Revendedores</h1>
        <p className="text-gray-600 mb-4">Productos usados publicados por otros revendedores</p>
        
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar productos..." className="pl-9" />
          </div>
          <Button variant="outline" onClick={() => setCategory("")}>Limpiar</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Cargando productos...</div>
      ) : !products?.length ? (
        <div className="text-center py-10 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay productos publicados aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(products as any[]).map((product) => {
            const imageUrl = getImageUrl(product.images);
            console.log("Producto:", product.id, "images:", product.images, "url:", imageUrl);
            return (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                {imageUrl && (
                  <div className="h-40 overflow-hidden rounded-t-lg bg-gray-100">
                    <img 
                      src={imageUrl} 
                      alt={product.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("Error cargando imagen:", imageUrl);
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{product.title}</CardTitle>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {product.vendorName || `Revendedor #${product.user_id}`}
                  </div>
                </CardHeader>
                <CardContent>
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl font-bold text-blue-600">{formatPrice(Number(product.price))}</span>
                    {product.stock > 0 ? (
                      <span className="text-xs text-green-600">Stock: {product.stock}</span>
                    ) : (
                      <span className="text-xs text-red-500">Sin stock</span>
                    )}
                  </div>
                  {product.category && (
                    <div className="text-xs text-gray-400 mb-2">Categoría: {product.category}</div>
                  )}
                  <Button variant="outline" className="w-full mt-2">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Contactar al revendedor
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
