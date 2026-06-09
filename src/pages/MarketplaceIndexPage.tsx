import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  Search, Plus, X, Trash2, CheckCircle, XCircle,
  Package, User, Store, Shield, Phone, Check, Smartphone, Laptop, Gamepad2, Tv, Headphones, Watch
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MarketplaceTermsModal } from "@/components/MarketplaceTermsModal";

const TERMS_KEY = "marketplace_terms_accepted";

// Categorías visuales
const CATEGORIES = [
  { id: "celulares", icon: Smartphone, label: "Celulares", color: "bg-blue-100 text-blue-600" },
  { id: "notebooks", icon: Laptop, label: "Notebooks", color: "bg-purple-100 text-purple-600" },
  { id: "consolas", icon: Gamepad2, label: "Consolas", color: "bg-green-100 text-green-600" },
  { id: "tv", icon: Tv, label: "TV y Audio", color: "bg-red-100 text-red-600" },
  { id: "audifonos", icon: Headphones, label: "Auriculares", color: "bg-yellow-100 text-yellow-600" },
  { id: "relojes", icon: Watch, label: "Smartwatches", color: "bg-indigo-100 text-indigo-600" },
];

export default function MarketplaceIndexPage() {
  const { user, isAdmin, isSuperadmin } = useAuth();
  const [showTerms, setShowTerms] = useState(false);
  const [activeTab, setActiveTab] = useState<"explorar" | "mis-publicaciones" | "aprobar">("explorar");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const utils = trpc.useUtils();
  
  useEffect(() => {
    const hasAccepted = localStorage.getItem(TERMS_KEY);
    if (!hasAccepted && user) {
      setShowTerms(true);
    }
  }, [user]);
  
  const handleAcceptTerms = () => {
    localStorage.setItem(TERMS_KEY, "true");
    setShowTerms(false);
  };
  
  const { data: products, isLoading: loadingProducts } = trpc.vendorProducts.list.useQuery({
    search: searchQuery || undefined,
    category: selectedCategory || undefined,
  });
  
  const { data: myProducts, isLoading: loadingMyProducts } = trpc.vendorProducts.myProducts.useQuery();
  const { data: pendingProducts, isLoading: loadingPending } = trpc.vendorProducts.adminList.useQuery(undefined, {
    enabled: isAdmin || isSuperadmin,
  });
  
  const publish = trpc.vendorProducts.publish.useMutation({
    onSuccess: (data) => {
      alert(data.message);
      resetForm();
      setShowPublishModal(false);
      utils.vendorProducts.list.invalidate();
      utils.vendorProducts.myProducts.invalidate();
      utils.vendorProducts.adminList.invalidate();
    },
    onError: (err) => alert("Error: " + err.message),
  });
  
  const approveProduct = trpc.vendorProducts.approve.useMutation({
    onSuccess: () => {
      utils.vendorProducts.adminList.invalidate();
      utils.vendorProducts.list.invalidate();
      alert("Producto aprobado");
    },
  });
  
  const rejectProduct = trpc.vendorProducts.reject.useMutation({
    onSuccess: () => {
      utils.vendorProducts.adminList.invalidate();
      alert("Producto rechazado");
    },
  });
  
  const deleteProduct = trpc.vendorProducts.delete.useMutation({
    onSuccess: () => {
      utils.vendorProducts.myProducts.invalidate();
      utils.vendorProducts.list.invalidate();
      utils.vendorProducts.adminList.invalidate();
      alert("Producto eliminado");
    },
  });
  
  const markAsSold = trpc.vendorProducts.markAsSold.useMutation({
    onSuccess: () => {
      utils.vendorProducts.myProducts.invalidate();
      utils.vendorProducts.list.invalidate();
      alert("Producto marcado como vendido");
    },
  });
  
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setCategory("");
    setImages([]);
    setImageUrls([]);
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 3) {
      alert("Máximo 3 imágenes por producto");
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    files.forEach(file => formData.append("images", file));
    
    try {
      const response = await fetch("/api/upload/images", { method: "POST", body: formData });
      const data = await response.json();
      if (data.success && data.urls) {
        setImages([...images, ...files]);
        setImageUrls([...imageUrls, ...data.urls]);
      } else {
        alert(data.error || "Error al subir imágenes");
      }
    } catch (error) {
      alert("Error al subir imágenes");
    }
    setUploading(false);
  };
  
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };
  
  const handleSubmit = () => {
    if (!title || !price) {
      alert("Título y precio son obligatorios");
      return;
    }
    publish.mutate({
      name: title,
      description,
      price: parseFloat(price),
      stock: 1,
      category: category || undefined,
      imageUrls,
      phone: user?.phone || "",
    });
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price);
  };
  
  const getImageUrl = (images: any) => {
    if (!images) return null;
    try {
      const urls = typeof images === 'string' ? JSON.parse(images) : images;
      return urls.length > 0 ? urls[0] : null;
    } catch {
      return null;
    }
  };
  
  const openWhatsApp = (phone: string, productTitle: string, productPrice: string) => {
    if (!phone) {
      alert("El vendedor no tiene número de teléfono registrado");
      return;
    }
    let cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone.startsWith("54")) cleanPhone = "54" + cleanPhone;
    const message = `Hola! Me interesa tu producto: ${productTitle} - ${formatPrice(parseFloat(productPrice))}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };
  
  const getStatusBadge = (status: string, sold?: boolean) => {
    if (sold) return <Badge className="badge badge-success">Vendido</Badge>;
    if (status === "approved") return <Badge className="badge badge-success">Activo</Badge>;
    if (status === "pending") return <Badge className="badge badge-warning">Pendiente</Badge>;
    return <Badge className="badge badge-danger">Rechazado</Badge>;
  };
  
  const pendingOnly = (pendingProducts as any[])?.filter(p => p.status === "pending") || [];
  
  return (
    <>
      <MarketplaceTermsModal open={showTerms} onAccept={handleAcceptTerms} />
      
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header simplificado */}
        <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Marketplace
                </h1>
              </div>
            </div>
            
            {/* Barra de búsqueda */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Buscar productos..." 
                className="pl-9 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            
            {/* Chips de categorías scrolleables */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-thin">
              <button
                onClick={() => setSelectedCategory("")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === ""
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Todos
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white shadow-md"
                      : cat.color
                  }`}
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
            <button
              onClick={() => setActiveTab("explorar")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "explorar"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Explorar
            </button>
            <button
              onClick={() => setActiveTab("mis-publicaciones")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "mis-publicaciones"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Mis publicaciones
            </button>
            {(isAdmin || isSuperadmin) && (
              <button
                onClick={() => setActiveTab("aprobar")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                  activeTab === "aprobar"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Shield className="w-3 h-3" />
                Aprobar
                {pendingOnly.length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-1.5">
                    {pendingOnly.length}
                  </span>
                )}
              </button>
            )}
          </div>
          
          {/* Explorar */}
          {activeTab === "explorar" && (
            loadingProducts ? (
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse"></div>
                ))}
              </div>
            ) : !products?.length ? (
              <div className="text-center py-20 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No hay productos</p>
                <p className="text-sm mt-1">Sé el primero en publicar algo</p>
                <Button onClick={() => setShowPublishModal(true)} className="mt-4 btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Publicar producto
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(products as any[]).map((product) => {
                  const imageUrl = getImageUrl(product.images);
                  const contactPhone = product.vendor_phone || (product as any).userPhone;
                  return (
                    <Card key={product.id} className="card-hover overflow-hidden rounded-xl fade-in">
                      {imageUrl ? (
                        <div className="aspect-square overflow-hidden bg-gray-100">
                          <img src={imageUrl} alt={product.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <CardContent className="p-3">
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{product.title}</h3>
                        <p className="text-base font-bold text-blue-600 mt-1">{formatPrice(Number(product.price))}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-3 h-3 text-gray-500" />
                            </div>
                            <span className="text-xs text-gray-500 truncate max-w-[80px]">
                              {product.vendorName || "Revendedor"}
                            </span>
                          </div>
                          {contactPhone && (
                            <button
                              onClick={() => openWhatsApp(contactPhone, product.title, product.price)}
                              className="btn-whatsapp p-2 rounded-full w-8 h-8 flex items-center justify-center"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )
          )}
          
          {/* Mis publicaciones */}
          {activeTab === "mis-publicaciones" && (
            loadingMyProducts ? (
              <div className="text-center py-20">Cargando...</div>
            ) : !myProducts?.length ? (
              <div className="text-center py-20 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No tenés publicaciones</p>
                <Button onClick={() => setShowPublishModal(true)} className="mt-4 btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear publicación
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {(myProducts as any[]).map((product) => {
                  const imageUrl = getImageUrl(product.images);
                  return (
                    <Card key={product.id} className="overflow-hidden rounded-xl card-hover">
                      <div className="flex p-3 gap-3">
                        {imageUrl ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img src={imageUrl} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                          <p className="text-blue-600 font-bold">{formatPrice(Number(product.price))}</p>
                          <div className="mt-1">
                            {getStatusBadge(product.status, product.sold)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {product.status === "approved" && !product.sold && (
                            <Button size="sm" variant="outline" className="border-green-300 text-green-600 text-xs h-8" onClick={() => markAsSold.mutate({ id: product.id })}>
                              <Check className="w-3 h-3 mr-1" /> Vendido
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-red-500 h-8 w-8 p-0" onClick={() => { if(confirm("Eliminar?")) deleteProduct.mutate({ id: product.id }); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          )}
          
          {/* Aprobar */}
          {(isAdmin || isSuperadmin) && activeTab === "aprobar" && (
            loadingPending ? (
              <div className="text-center py-20">Cargando...</div>
            ) : pendingOnly.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">No hay productos pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOnly.map((product: any) => {
                  const imageUrl = getImageUrl(product.images);
                  return (
                    <Card key={product.id} className="overflow-hidden rounded-xl border-l-4 border-yellow-500">
                      <div className="flex p-3 gap-3">
                        {imageUrl ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img src={imageUrl} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold">{product.title}</h3>
                          <p className="text-blue-600 font-bold">{formatPrice(Number(product.price))}</p>
                          <p className="text-xs text-gray-500">Revendedor: {product.vendorName || product.vendorEmail}</p>
                          {product.rejection_reason && <p className="text-xs text-orange-600 mt-1">📌 {product.rejection_reason}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8" onClick={() => approveProduct.mutate({ id: product.id })}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Aprobar
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-300 text-red-600 h-8" onClick={() => rejectProduct.mutate({ id: product.id })}>
                            <XCircle className="w-3 h-3 mr-1" /> Rechazar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          )}
        </div>
        
        {/* Botón flotante */}
        <button 
          onClick={() => setShowPublishModal(true)} 
          className="fixed bottom-20 right-4 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-all active:scale-95 z-20 tap-target"
        >
          <Plus className="w-6 h-6" />
        </button>
        
        {/* Modal de publicación */}
        <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
          <DialogContent className="max-w-lg rounded-2xl bg-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Publicar producto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading || images.length >= 3} className="hidden" id="publish-images" />
                <label htmlFor="publish-images" className="cursor-pointer text-blue-600 tap-target inline-flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  {uploading ? "Subiendo..." : "Agregar fotos (máx 3)"}
                </label>
              </div>
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img src={url} className="w-full h-20 object-cover rounded-lg" />
                      <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 tap-target-sm">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
              <Input type="number" placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-xl" />
              <Input placeholder="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl" />
              <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-500">
                📱 Tu teléfono: {user?.phone || "No registrado"}
              </div>
              <Textarea placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="rounded-xl" />
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowPublishModal(false)} className="flex-1 rounded-xl">Cancelar</Button>
                <Button onClick={handleSubmit} disabled={publish.isPending} className="flex-1 btn-primary rounded-xl">
                  {publish.isPending ? "Publicando..." : "Publicar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
