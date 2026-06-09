import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, CheckCircle, Truck, Loader2, Navigation, PlusCircle } from "lucide-react";

export default function DeliveryPage() {
  const [currentStop, setCurrentStop] = useState<any>(null);
  const [nextStops, setNextStops] = useState<any[]>([]);
  
  const utils = trpc.useUtils();
  
  const { data: route, isLoading: routeLoading, refetch: refetchRoute } = trpc.logistics.getActiveRoute.useQuery();
  const { data: nextStop, refetch: refetchNextStop } = trpc.logistics.getNextStop.useQuery();
  
  const generateRoutes = trpc.logistics.generateRoutes.useMutation({
    onSuccess: (data) => {
      alert(`✅ Rutas generadas: ${data.morning} mañana, ${data.afternoon} tarde`);
      refetchRoute();
      refetchNextStop();
    },
    onError: (err) => alert("Error: " + err.message)
  });
  
  const markDelivered = trpc.logistics.markAsDelivered.useMutation({
    onSuccess: () => {
      refetchNextStop();
      refetchRoute();
      alert("✅ Entrega marcada como completada");
    }
  });
  
  // Actualizar cuando cambia nextStop
  useState(() => {
    if (nextStop) {
      setCurrentStop(nextStop);
      if (route?.stops) {
        const currentIndex = nextStop.index;
        setNextStops(route.stops.slice(currentIndex + 1));
      }
    }
  }, [nextStop, route]);
  
  if (routeLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }
  
  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Botón para generar rutas de prueba */}
      <div className="mb-4">
        <Button 
          onClick={() => generateRoutes.mutate({})} 
          disabled={generateRoutes.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {generateRoutes.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlusCircle className="w-4 h-4 mr-2" />}
          Generar rutas de prueba
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Esto genera rutas con órdenes existentes que tengan dirección cargada
        </p>
      </div>
      
      {!currentStop ? (
        <div className="text-center py-20">
          <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold">Sin rutas activas</h1>
          <p className="text-gray-500 mt-2">
            Presioná "Generar rutas de prueba" para comenzar
          </p>
        </div>
      ) : (
        <>
          <div className="bg-green-600 text-white p-4 rounded-xl mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Repartidor</p>
                <h1 className="text-xl font-bold">🚚 Ruta activa</h1>
              </div>
              <Truck className="w-8 h-8" />
            </div>
            <p className="text-sm mt-2">
              📍 {currentStop.remaining} entregas restantes
            </p>
          </div>
          
          <Card className="mb-4 border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                Próximo destino
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900">{currentStop.userName}</p>
                <p className="text-sm text-gray-500 mt-1">{currentStop.address}</p>
                {currentStop.userPhone && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <Phone className="w-4 h-4" />
                    <a href={`https://wa.me/${currentStop.userPhone.replace(/\D/g, '')}`} target="_blank" className="text-green-600">
                      Contactar por WhatsApp
                    </a>
                  </div>
                )}
              </div>
              
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                onClick={() => {
                  if (confirm(`¿Confirmar entrega en ${currentStop.address}?`)) {
                    markDelivered.mutate({ orderId: currentStop.orderId });
                  }
                }}
                disabled={markDelivered.isPending}
              >
                {markDelivered.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                Marcar como entregado
              </Button>
            </CardContent>
          </Card>
          
          {nextStops.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Próximas entregas ({nextStops.length})
              </h2>
              <div className="space-y-2">
                {nextStops.map((stop, idx) => (
                  <div key={idx} className="bg-white border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{stop.userName}</p>
                        <p className="text-xs text-gray-500 mt-1">{stop.address}</p>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
