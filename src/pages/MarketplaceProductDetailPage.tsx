import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Phone,
  User,
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Tag,
  MapPin,
} from "lucide-react";

export default function MarketplaceProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const productId = parseInt(id || "0");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: product, isLoading } = trpc.vendorProducts.getById.useQuery(
    { id: productId },
    { enabled: productId > 0 }
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getImageUrls = (images: any): string[] => {
    if (!images) return [];
    try {
      const urls =
        typeof images === "string" ? JSON.parse(images) : images;
      return Array.isArray(urls) ? urls : [];
    } catch {
      return [];
    }
  };

  const openWhatsApp = (
    phone: string,
    productTitle: string,
    productPrice: number
  ) => {
    if (!phone) {
      alert("El vendedor no tiene número de teléfono registrado");
      return;
    }
    let cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone.startsWith("54")) cleanPhone = "54" + cleanPhone;
    const message = `Hola! Ví tu producto en el marketplace de Genio de la Lámpara y me interesa: ${productTitle} - ${formatPrice(productPrice)}`;
    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-xl"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg text-gray-500">Producto no encontrado</p>
        <Button onClick={() => navigate("/marketplace")} className="mt-4">
          Volver al marketplace
        </Button>
      </div>
    );
  }

  const imageUrls = getImageUrls(product.images);
  const contactPhone = product.vendor_phone || product.userPhone;
  const isOwner = user?.id === product.user_id;

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* Botón volver */}
      <Button
        variant="ghost"
        onClick={() => navigate("/marketplace")}
        className="mb-4 -ml-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver al marketplace
      </Button>

      {/* Galería de imágenes */}
      <div className="relative bg-gray-100 rounded-2xl overflow-hidden mb-4">
        {imageUrls.length > 0 ? (
          <>
            <div className="aspect-square">
              <img
                src={imageUrls[currentImageIndex]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Navegación de imágenes */}
            {imageUrls.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev > 0 ? prev - 1 : imageUrls.length - 1
                    )
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev < imageUrls.length - 1 ? prev + 1 : 0
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Indicadores */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {imageUrls.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex
                          ? "bg-white w-4"
                          : "bg-white/60"
                      }`}
                    />
                  ))}
                </div>

                {/* Contador */}
                <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  {currentImageIndex + 1} / {imageUrls.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="aspect-square flex items-center justify-center">
            <Package className="w-20 h-20 text-gray-300" />
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {imageUrls.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {imageUrls.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImageIndex(idx)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentImageIndex
                  ? "border-blue-500"
                  : "border-transparent"
              }`}
            >
              <img
                src={url}
                alt={`${product.title} ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Info del producto */}
      <div className="space-y-4">
        {/* Título y precio */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {product.title}
          </h1>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {formatPrice(Number(product.price))}
          </p>
        </div>

        {/* Badges de estado */}
        <div className="flex gap-2 flex-wrap">
          {product.sold ? (
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
              Vendido
            </Badge>
          ) : (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              Disponible
            </Badge>
          )}
          {product.category && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {product.category}
            </Badge>
          )}
        </div>

        {/* Descripción */}
        {product.description && (
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold text-gray-900 mb-2">
                Descripción
              </h2>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                {product.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info del vendedor */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold text-gray-900 mb-3">
              Información del vendedor
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span>{product.vendorName || "Revendedor"}</span>
              </div>
              {contactPhone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{contactPhone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Publicado el {formatDate(product.created_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botón WhatsApp */}
        {!product.sold && contactPhone && !isOwner && (
          <Button
            onClick={() =>
              openWhatsApp(contactPhone, product.title, Number(product.price))
            }
            className="w-full bg-green-500 hover:bg-green-600 text-white h-14 text-lg rounded-xl"
          >
            <Phone className="w-5 h-5 mr-2" />
            Contactar por WhatsApp
          </Button>
        )}

        {isOwner && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-blue-700 font-medium">
              Esta es tu publicación
            </p>
            <p className="text-blue-500 text-sm mt-1">
              Podés gestionarla desde "Mis publicaciones"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
