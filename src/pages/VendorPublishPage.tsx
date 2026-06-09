import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Upload, Loader2, X, Image as ImageIcon } from "lucide-react";

export default function VendorPublishPage() {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const publish = trpc.vendorProducts.publish.useMutation({
    onSuccess: (data) => {
      alert(data.message || "Producto publicado");
      setName("");
      setDescription("");
      setPrice("");
      setStock("");
      setCategory("");
      setImages([]);
      setImageUrls([]);
      utils.vendorProducts.myProducts.invalidate();
      utils.vendorProducts.list.invalidate();
    },
    onError: (err) => alert("Error: " + err.message),
  });

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
      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) {
      alert("Nombre y precio son obligatorios");
      return;
    }
    
    publish.mutate({
      name,
      description,
      price: parseFloat(price),
      stock: stock ? parseInt(stock) : 0,
      category: category || undefined,
      imageUrls: imageUrls,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Publicar producto en el Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del producto *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: iPhone 12 usado" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe el producto..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Precio *</label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock</label>
                <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoría</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: Celulares, Notebooks..." />
            </div>
            
            {/* Subida de imágenes */}
            <div>
              <label className="block text-sm font-medium mb-1">Imágenes (máx 3)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploading || images.length >= 3}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
                  <ImageIcon className="w-5 h-5" />
                  {uploading ? "Subiendo..." : "Seleccionar imágenes"}
                </label>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG hasta 5MB cada una</p>
              </div>
              
              {/* Vista previa de imágenes */}
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img src={url} alt={`Preview ${idx}`} className="w-full h-24 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Button type="submit" disabled={publish.isPending || uploading} className="w-full">
              {publish.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {publish.isPending ? "Publicando..." : "Publicar producto"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
