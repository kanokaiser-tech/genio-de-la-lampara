import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Package,
  ShoppingCart, ImageOff
} from "lucide-react";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);
  const [qty, setQty] = useState(1);

  // El slug puede ser un ID numérico o un slug real
  const productId = slug && /^\d+$/.test(slug) ? parseInt(slug) : undefined;

  // Buscar por ID si es numérico, o por slug
  const { data: product, isLoading } = productId
    ? trpc.product.detail.useQuery({ id: productId })
    : { data: null, isLoading: false };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Producto no encontrado</p>
        <Button onClick={() => navigate("/productos")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver al catalogo
        </Button>
      </div>
    );
  }

  // Imagenes: array de images o fallback a imageUrl
  const images: string[] = (product as any).images || [];
  if (images.length === 0 && product.imageUrl) images.push(product.imageUrl);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price);

  const handleAddToCart = () => {
    // Agregar al carrito via localStorage
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((item: any) => item.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.priceCash30),
        priceTransfer: Number(product.priceTransfer25),
        image: product.imageUrl,
        qty,
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    // Disparar evento para actualizar navbar
    window.dispatchEvent(new Event("cartUpdated"));
    alert(`Agregado: ${product.name} x${qty}`);
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Boton volver */}
      <Button
        variant="ghost"
        onClick={() => navigate("/productos")}
        className="mb-4 -ml-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver al catalogo
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Galeria de imagenes */}
        <div className="space-y-3">
          {/* Imagen principal */}
          <div className="bg-gray-100 rounded-2xl overflow-hidden aspect-square relative">
            {images.length > 0 ? (
              <img
                src={images[currentImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="w-20 h-20 text-gray-300" />
              </div>
            )}

            {/* Flechas de navegacion */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImage(prev => prev > 0 ? prev - 1 : images.length - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentImage(prev => prev < images.length - 1 ? prev + 1 : 0)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Contador */}
                <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  {currentImage + 1} / {images.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(idx)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === currentImage ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info del producto */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">{product.category}</p>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          </div>

          {/* Precios */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-600">
                {formatPrice(Number(product.priceCash30))}
              </span>
              <span className="text-sm text-blue-400">efectivo</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-green-600">
                {formatPrice(Number(product.priceTransfer25))}
              </span>
              <span className="text-sm text-green-400">transferencia</span>
            </div>
            <p className="text-xs text-gray-500">
              Precio lista: {formatPrice(Number(product.priceList))}
            </p>
          </div>

          {/* Stock */}
          {Number(product.stock) <= 5 && Number(product.stock) > 0 && (
            <p className="text-sm text-orange-600 font-medium">
              Solo quedan {product.stock} unidades
            </p>
          )}
          {Number(product.stock) <= 0 && (
            <p className="text-sm text-red-600 font-medium">
              Sin stock
            </p>
          )}

          {/* Cantidad + Agregar */}
          <div className="flex gap-3 items-center">
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100"
              >
                -
              </button>
              <span className="px-3 py-2 font-medium min-w-[40px] text-center">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100"
              >
                +
              </button>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={Number(product.stock) <= 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Agregar al carrito
            </Button>
          </div>
        </div>
      </div>

      {/* Descripcion */}
      {product.description && (
        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Descripcion</h2>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}

      {/* Imagenes adicionales como grid si hay muchas */}
      {images.length > 1 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Galeria de imagenes</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((url, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImage(idx)}
                className="aspect-square rounded-xl overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
