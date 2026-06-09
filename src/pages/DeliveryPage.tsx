import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import {
  Loader2, MapPin, Phone, CheckCircle, Truck, Navigation,
  Plus, ChevronDown, ChevronUp, Sun, Moon, X, GripVertical,
  Route, Package
} from "lucide-react";

// Leaflet se carga dinamicamente dentro del componente
let leafletLoaded = false;

/* ================================================================ */
/*  Componente principal                                            */
/* ================================================================ */
export default function DeliveryPage() {
  const utils = trpc.useUtils();
  const [selectedShift, setSelectedShift] = useState<"morning" | "afternoon">(
    new Date().getHours() < 14 ? "morning" : "afternoon"
  );
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [mapReady, setMapReady] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedStop, setExpandedStop] = useState<number | null>(null);

  // Leaflet refs
  const [L, setL] = useState<any>(null);
  const [RL, setRL] = useState<any>(null);

  // Formulario para agregar destino manual
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  // Queries
  const { data: route, isLoading: routeLoading, refetch: refetchRoute } =
    trpc.logistics.getActiveRoute.useQuery({ date: selectedDate, shift: selectedShift });

  const { data: allRoutes, refetch: refetchAll } =
    trpc.logistics.getAllRoutes.useQuery({ date: selectedDate });

  const { data: pendingDeliveries } =
    trpc.logistics.getPendingDeliveries.useQuery({ date: selectedDate });

  // Mutations
  const generateRoutes = trpc.logistics.generateRoutes.useMutation({
    onSuccess: (data) => {
      alert(`Rutas generadas: ${data.morning} mañana, ${data.afternoon} tarde`);
      refetchRoute(); refetchAll();
    },
    onError: (err) => alert("Error: " + err.message),
  });

  const markDelivered = trpc.logistics.markAsDelivered.useMutation({
    onSuccess: () => { refetchRoute(); refetchAll(); },
  });

  const addManualStop = trpc.logistics.addManualStop.useMutation({
    onSuccess: () => {
      refetchRoute(); refetchAll();
      setShowAddForm(false);
      setManualName(""); setManualAddress(""); setManualPhone(""); setManualNotes("");
    },
    onError: (err) => alert("Error: " + err.message),
  });

  const removeStop = trpc.logistics.removeStop.useMutation({
    onSuccess: () => { refetchRoute(); refetchAll(); },
  });

  const reorderStops = trpc.logistics.reorderStops.useMutation({
    onSuccess: () => { refetchRoute(); refetchAll(); },
  });

  // Cargar Leaflet dinámicamente
  useEffect(() => {
    if (leafletLoaded) return;
    leafletLoaded = true;
    
    import("leaflet").then((leafletModule) => {
      import("leaflet/dist/leaflet.css");
      import("react-leaflet").then((reactLeaflet) => {
        setL(leafletModule.default || leafletModule);
        setRL(reactLeaflet);
        setMapReady(true);
      });
    }).catch((err) => {
      console.error("Error loading Leaflet:", err);
      leafletLoaded = false;
    });
  }, []);

  const stops = route?.stops || [];
  const depot = route?.depot || { lat: -38.9516, lng: -68.0591 };
  const deliveredCount = stops.filter((s: any) => s.delivered).length;
  const pendingCount = stops.filter((s: any) => !s.delivered).length;

  // Drag & drop handlers
  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newOrder = stops.map((_: any, i: number) => i);
    const [moved] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, moved);
    setDraggedIndex(index);
  };
  const handleDragEnd = () => {
    if (draggedIndex !== null && route) {
      const newOrder = stops.map((_: any, i: number) => i);
      reorderStops.mutate({ routeId: route.id, newOrder });
    }
    setDraggedIndex(null);
  };

  // Crear iconos
  const getDepotIcon = useCallback(() => {
    if (!L) return null;
    return L.divIcon({
      className: "custom-marker",
      html: `<div style="background:#ef4444;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:18px;">🏭</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }, [L]);

  const getNumberedIcon = useCallback((num: number, delivered: boolean) => {
    if (!L) return null;
    const bg = delivered ? "#22c55e" : "#3b82f6";
    return L.divIcon({
      className: "custom-marker",
      html: `<div style="background:${bg};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">${num}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, [L]);

  // Mapa con Leaflet
  const renderMap = () => {
    if (!mapReady || !L || !RL) {
      return (
        <div className="h-80 w-full bg-gray-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      );
    }

    const { MapContainer, TileLayer, Marker, Popup, Polyline } = RL;

    return (
      <MapContainer center={[depot.lat, depot.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[depot.lat, depot.lng]} icon={getDepotIcon()}>
          <Popup><b>Deposito</b><br/>Ruca Choroy y Spinelli, Neuquen</Popup>
        </Marker>
        {stops.map((stop: any, idx: number) => (
          <Marker
            key={idx}
            position={[stop.lat, stop.lng]}
            icon={getNumberedIcon(idx + 1, stop.delivered)}
          >
            <Popup>
              <div className="text-sm">
                <b>#{idx + 1} {stop.userName || stop.name}</b><br/>
                {stop.address}<br/>
                {stop.userPhone && <span>📞 {stop.userPhone}</span>}
                {stop.delivered && <div className="text-green-600 font-bold mt-1">Entregado</div>}
              </div>
            </Popup>
          </Marker>
        ))}
        <Polyline
          positions={[
            [depot.lat, depot.lng],
            ...stops.filter((s: any) => !s.delivered).map((s: any) => [s.lat, s.lng]),
          ]}
          color="#3b82f6"
          weight={3}
          opacity={0.7}
          dashArray="8, 8"
        />
      </MapContainer>
    );
  };

  if (routeLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Truck className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reparto</h1>
          <p className="text-sm text-gray-500">Gestion de rutas de entrega</p>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedShift("morning")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedShift === "morning" ? "bg-white text-amber-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Sun className="w-4 h-4" /> Mañana
            </button>
            <button
              onClick={() => setSelectedShift("afternoon")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedShift === "afternoon" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Moon className="w-4 h-4" /> Tarde
            </button>
          </div>
          <Button
            onClick={() => generateRoutes.mutate({ date: selectedDate, shift: selectedShift })}
            disabled={generateRoutes.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {generateRoutes.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Route className="w-4 h-4 mr-2" />}
            Generar ruta con IA
          </Button>
        </div>

        {stops.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-gray-600">
              <Package className="w-4 h-4" /> {stops.length} entregas
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" /> {deliveredCount} entregadas
            </span>
            <span className="flex items-center gap-1 text-blue-600">
              <Navigation className="w-4 h-4" /> {pendingCount} pendientes
            </span>
          </div>
        )}
      </div>

      {/* Sin ruta */}
      {!route || stops.length === 0 ? (
        <div className="text-center py-16">
          <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sin ruta activa</h2>
          <p className="text-gray-500 mb-2">No hay entregas programadas para {selectedShift === "morning" ? "la mañana" : "la tarde"}.</p>
          {pendingDeliveries && pendingDeliveries.length > 0 && (
            <p className="text-sm text-blue-600 mb-4">Hay {pendingDeliveries.length} pedidos con envio pendiente sin ruta asignada.</p>
          )}
          <Button onClick={() => generateRoutes.mutate({ date: selectedDate, shift: selectedShift })} disabled={generateRoutes.isPending} className="bg-blue-600 hover:bg-blue-700">
            {generateRoutes.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Route className="w-4 h-4 mr-2" />}
            Generar ruta con IA
          </Button>
        </div>
      ) : (
        <>
          {/* Mapa */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-sm">
            <div className="h-80 w-full">
              {renderMap()}
            </div>
          </div>

          {/* Lista de entregas - Draggable */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-600" />
                Orden de entregas
              </h2>
              <span className="text-xs text-gray-500">Arrastra para reordenar</span>
            </div>

            <div className="space-y-2">
              {stops.map((stop: any, idx: number) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`border rounded-xl transition-all cursor-move ${
                    stop.delivered
                      ? "bg-green-50 border-green-200 opacity-70"
                      : draggedIndex === idx
                      ? "bg-blue-50 border-blue-300 shadow-md"
                      : "bg-white border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div
                    className="flex items-center gap-3 p-3"
                    onClick={() => setExpandedStop(expandedStop === idx ? null : idx)}
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      stop.delivered ? "bg-green-500" : "bg-blue-600"
                    }`}>
                      {stop.delivered ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${stop.delivered ? "line-through text-gray-400" : "text-gray-900"}`}>
                        {stop.userName || stop.name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{stop.address}</p>
                    </div>
                    {stop.isManual && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Manual</span>
                    )}
                    {expandedStop === idx ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>

                  {expandedStop === idx && (
                    <div className="px-3 pb-3 border-t border-gray-100 pt-2">
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <p className="text-sm"><b>Direccion:</b> {stop.address}</p>
                        {(stop.userPhone || stop.phone) && (
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <a href={`https://wa.me/${(stop.userPhone || stop.phone).replace(/\D/g, '')}`} target="_blank" className="text-green-600 hover:underline">
                              {stop.userPhone || stop.phone}
                            </a>
                          </p>
                        )}
                        {stop.notes && <p className="text-sm text-gray-600">📝 {stop.notes}</p>}
                        {stop.shippingType && (
                          <p className="text-xs text-gray-500">
                            {stop.shippingType === "express" ? "⚡ Envio Express" : "🚚 Envio Gratis"}
                          </p>
                        )}

                        <div className="flex gap-2 pt-1">
                          {!stop.delivered ? (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white flex-1"
                              onClick={() => {
                                if (confirm(`Marcar como entregado: ${stop.userName || stop.name}?`)) {
                                  markDelivered.mutate({ orderId: stop.orderId, routeId: route!.id, stopIndex: idx });
                                }
                              }}
                              disabled={markDelivered.isPending}
                            >
                              {markDelivered.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                              Entregado
                            </Button>
                          ) : (
                            <span className="flex-1 text-center text-green-600 text-sm font-medium py-1">✅ Entrega completada</span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => { if (confirm("Eliminar esta parada de la ruta?")) removeStop.mutate({ routeId: route!.id, stopIndex: idx }); }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Agregar destino manual */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full py-3 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 font-medium hover:bg-purple-50 transition-all text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Agregar destino manual
              </button>
            ) : (
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-600" /> Nuevo destino
                </h3>
                <input
                  type="text"
                  placeholder="Nombre del cliente"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Direccion completa (ej: Ruca Choroy 123, Neuquen)"
                  value={manualAddress}
                  onChange={e => setManualAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Telefono (opcional)"
                  value={manualPhone}
                  onChange={e => setManualPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Notas (opcional)"
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (manualName && manualAddress && route) {
                        addManualStop.mutate({ routeId: route.id, name: manualName, address: manualAddress, phone: manualPhone, notes: manualNotes });
                      }
                    }}
                    disabled={!manualName || !manualAddress || addManualStop.isPending}
                    className="bg-purple-600 hover:bg-purple-700 flex-1"
                  >
                    {addManualStop.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Agregar a la ruta"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Pedidos pendientes sin ruta */}
      {pendingDeliveries && pendingDeliveries.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
            <Package className="w-5 h-5" /> Pedidos con envio sin ruta ({pendingDeliveries.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pendingDeliveries.map((d: any) => (
              <div key={d.orderId} className="bg-white rounded-lg p-2 text-sm flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{d.userName}</p>
                  <p className="text-xs text-gray-500">{d.address}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${d.preferredTime === "afternoon" ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"}`}>
                  {d.preferredTime === "afternoon" ? "Tarde" : "Mañana"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
