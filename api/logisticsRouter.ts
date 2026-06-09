import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";

// Coordenadas del deposito - Ruca Choroy y Spinelli, Neuquen
const DEPOT = { lat: -38.9516, lng: -68.0591, address: "Ruca Choroy y Spinelli, Neuquen" };

// DeepSeek API config
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-85ef8b9e1ff446d4822407982dbf742e";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

// ================================================================
// Helpers
// ================================================================
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Geocodificar direccion con Nominatim (OpenStreetMap) - gratis
async function geocodeAddress(address: string): Promise<{lat: number; lng: number} | null> {
  try {
    const fullAddress = `${address}, Neuquen, Argentina`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`;
    const response = await fetch(url, { headers: { "User-Agent": "GenioDeLaLampara/1.0" } });
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (e) {
    console.error("Geocoding error:", e);
    return null;
  }
}

// Optimizar ruta con DeepSeek IA
async function optimizeRouteWithAI(stops: any[]): Promise<any[]> {
  if (stops.length <= 1) return stops;

  const stopsWithCoords = stops.map((s, i) => ({
    index: i,
    name: s.userName || s.name,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
  }));

  const prompt = `Sos un optimizador de rutas de delivery en Neuquen Capital, Argentina.
Tu tarea: ordenar las siguientes entregas de la forma mas eficiente.

REGLAS:
- El punto de inicio es el deposito en Ruca Choroy y Spinelli, Neuquen (lat: ${DEPOT.lat}, lng: ${DEPOT.lng})
- Todas las direcciones estan dentro de Neuquen Capital
- Considerar proximidad geografica (coordenadas lat/lng)
- Agrupar entregas cercanas
- Minimizar distancia total recorrida

ENTREGAS:
${stopsWithCoords.map(s => `- ${s.index}: ${s.name} - ${s.address} (lat: ${s.lat}, lng: ${s.lng})`).join("\n")}

Devolve SOLO un JSON con el orden optimizado de los indices:
{"optimizedOrder": [indice1, indice2, ...]}

Sin explicaciones, solo el JSON.`;

  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extraer JSON de la respuesta
    const jsonMatch = content.match(/\{[^}]*"optimizedOrder"[^}]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const order = parsed.optimizedOrder as number[];
      if (Array.isArray(order) && order.length === stops.length) {
        return order.map(i => stops[i]);
      }
    }
  } catch (e) {
    console.error("DeepSeek route optimization error:", e);
  }

  // Fallback: algoritmo del vecino mas cercano
  return nearestNeighbor(stops);
}

function nearestNeighbor(stops: any[]): any[] {
  if (stops.length === 0) return [];
  const remaining = [...stops];
  const optimized = [];
  let current = DEPOT;

  while (remaining.length > 0) {
    let closestIndex = 0;
    let closestDist = getDistance(current.lat, current.lng, remaining[0].lat, remaining[0].lng);
    for (let i = 1; i < remaining.length; i++) {
      const dist = getDistance(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    }
    optimized.push(remaining[closestIndex]);
    current = remaining[closestIndex];
    remaining.splice(closestIndex, 1);
  }
  return optimized;
}

// ================================================================
// Router
// ================================================================
export const logisticsRouter = createRouter({

  /* ================================================================
     GEOCODE - Convertir direccion a coordenadas
     ================================================================ */
  geocode: adminQuery
    .input(z.object({ address: z.string().min(3) }))
    .mutation(async ({ input }) => {
      const coords = await geocodeAddress(input.address);
      if (!coords) throw new Error("No se pudieron obtener coordenadas para esa direccion");
      return { ...coords, address: input.address };
    }),

  /* ================================================================
     SAVE ADDRESS - Revendedor guarda direccion de envio
     ================================================================ */
  saveAddress: authedQuery
    .input(z.object({
      orderId: z.number(),
      address: z.string().min(5),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const coords = await geocodeAddress(input.address);

      if (coords) {
        await db.execute(`
          UPDATE orders
          SET shipping_address = '${input.address.replace(/'/g, "''")}',
              deliveryLat = ${coords.lat},
              deliveryLng = ${coords.lng}
          WHERE id = ${input.orderId}
        `);
        return { success: true, coords };
      } else {
        await db.execute(`
          UPDATE orders SET shipping_address = '${input.address.replace(/'/g, "''")}' WHERE id = ${input.orderId}
        `);
        return { success: true, coords: null };
      }
    }),

  /* ================================================================
     GENERATE ROUTES - Crear rutas del dia con IA
     ================================================================ */
  generateRoutes: adminQuery
    .input(z.object({ date: z.string().optional(), shift: z.enum(["morning", "afternoon"]).optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const date = input.date || new Date().toISOString().split('T')[0];
      const shiftFilter = input.shift;

      // Obtener pedidos aprobados con envio y direccion
      const [pending] = await db.execute(`
        SELECT 
          o.id as orderId,
          o.userId,
          o.shipping_address as address,
          o.preferred_time as preferredTime,
          o.shipping_type as shippingType,
          o.deliveryLat,
          o.deliveryLng,
          u.name as userName,
          u.phone as userPhone
        FROM orders o
        JOIN users u ON o.userId = u.id
        WHERE o.delivery_status IN ('pending', 'in_route')
        AND o.shipping_address IS NOT NULL
        AND o.shipping_address != ''
        AND o.status = 'approved'
        AND o.shipping_type IN ('express', 'free')
      `);

      const morningStops: any[] = [];
      const afternoonStops: any[] = [];

      for (const order of (pending as any[])) {
        let lat = order.deliveryLat;
        let lng = order.deliveryLng;

        // Si no tiene coordenadas, geocodificar
        if (!lat || !lng) {
          const coords = await geocodeAddress(order.address);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
            await db.execute(`
              UPDATE orders SET deliveryLat = ${lat}, deliveryLng = ${lng} WHERE id = ${order.orderId}
            `);
          } else {
            continue; // Skip si no se puede geocodificar
          }
        }

        const stop = {
          orderId: order.orderId,
          userId: order.userId,
          address: order.address,
          userName: order.userName,
          userPhone: order.userPhone,
          shippingType: order.shippingType,
          lat, lng,
          isManual: false,
        };

        if (order.preferredTime === 'afternoon') {
          afternoonStops.push(stop);
        } else {
          morningStops.push(stop);
        }
      }

      // Desactivar rutas anteriores del dia
      await db.execute(`UPDATE delivery_routes SET isActive = 0 WHERE routeDate = '${date}'`);

      const results = { morning: 0, afternoon: 0 };

      // Generar ruta de mañana
      if (morningStops.length > 0 && (!shiftFilter || shiftFilter === 'morning')) {
        const optimized = await optimizeRouteWithAI(morningStops);
        await db.execute(`
          INSERT INTO delivery_routes (routeDate, shift, stops, isActive)
          VALUES ('${date}', 'morning', '${JSON.stringify(optimized).replace(/'/g, "''")}', 1)
        `);
        results.morning = optimized.length;
      }

      // Generar ruta de tarde
      if (afternoonStops.length > 0 && (!shiftFilter || shiftFilter === 'afternoon')) {
        const optimized = await optimizeRouteWithAI(afternoonStops);
        await db.execute(`
          INSERT INTO delivery_routes (routeDate, shift, stops, isActive)
          VALUES ('${date}', 'afternoon', '${JSON.stringify(optimized).replace(/'/g, "''")}', 1)
        `);
        results.afternoon = optimized.length;
      }

      return { success: true, ...results, total: results.morning + results.afternoon };
    }),

  /* ================================================================
     GET ACTIVE ROUTE - Ruta completa con todos los stops
     ================================================================ */
  getActiveRoute: adminQuery
    .input(z.object({ date: z.string().optional(), shift: z.enum(["morning", "afternoon"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const date = input?.date || new Date().toISOString().split('T')[0];
      const shift = input?.shift || (new Date().getHours() < 14 ? 'morning' : 'afternoon');

      const [routes] = await db.execute(`
        SELECT * FROM delivery_routes WHERE routeDate = '${date}' AND shift = '${shift}' AND isActive = 1
        ORDER BY id DESC LIMIT 1
      `);

      const route = (routes as any[])[0];
      if (!route) return null;

      const stops = JSON.parse(route.stops);

      // Verificar estado de entrega de cada stop
      for (const stop of stops) {
        const [orderRows] = await db.execute(`SELECT delivery_status FROM orders WHERE id = ${stop.orderId}`);
        stop.delivered = orderRows && (orderRows as any[])[0]?.delivery_status === 'delivered';
      }

      return {
        id: route.id,
        shift: route.shift,
        date: route.routeDate,
        stops,
        depot: DEPOT,
      };
    }),

  /* ================================================================
     GET ALL ROUTES - Para ver mañana y tarde
     ================================================================ */
  getAllRoutes: adminQuery
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const date = input?.date || new Date().toISOString().split('T')[0];

      const [routes] = await db.execute(`
        SELECT * FROM delivery_routes WHERE routeDate = '${date}' AND isActive = 1
      `);

      return (routes as any[]).map(r => ({
        id: r.id,
        shift: r.shift,
        stops: JSON.parse(r.stops),
        depot: DEPOT,
      }));
    }),

  /* ================================================================
     ADD MANUAL STOP - Admin agrega destino manual
     ================================================================ */
  addManualStop: adminQuery
    .input(z.object({
      routeId: z.number(),
      name: z.string().min(1),
      address: z.string().min(3),
      phone: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Geocodificar direccion
      const coords = await geocodeAddress(input.address);
      if (!coords) throw new Error("No se pudieron obtener coordenadas para esa direccion");

      // Obtener ruta actual
      const [routes] = await db.execute(`SELECT * FROM delivery_routes WHERE id = ${input.routeId}`);
      const route = (routes as any[])[0];
      if (!route) throw new Error("Ruta no encontrada");

      const stops = JSON.parse(route.stops);

      // Crear stop manual (sin orderId)
      const manualStop = {
        orderId: null,
        name: input.name,
        address: input.address,
        userName: input.name,
        userPhone: input.phone || "",
        notes: input.notes || "",
        lat: coords.lat,
        lng: coords.lng,
        isManual: true,
        delivered: false,
      };

      stops.push(manualStop);

      // Re-optimizar con IA
      const optimized = await optimizeRouteWithAI(stops);

      await db.execute(`
        UPDATE delivery_routes SET stops = '${JSON.stringify(optimized).replace(/'/g, "''")}' WHERE id = ${input.routeId}
      `);

      return { success: true, stop: manualStop };
    }),

  /* ================================================================
     REMOVE STOP - Eliminar un stop de la ruta
     ================================================================ */
  removeStop: adminQuery
    .input(z.object({ routeId: z.number(), stopIndex: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const [routes] = await db.execute(`SELECT * FROM delivery_routes WHERE id = ${input.routeId}`);
      const route = (routes as any[])[0];
      if (!route) throw new Error("Ruta no encontrada");

      const stops = JSON.parse(route.stops);
      if (input.stopIndex < 0 || input.stopIndex >= stops.length) throw new Error("Indice invalido");

      stops.splice(input.stopIndex, 1);

      await db.execute(`
        UPDATE delivery_routes SET stops = '${JSON.stringify(stops).replace(/'/g, "''")}' WHERE id = ${input.routeId}
      `);

      return { success: true, remaining: stops.length };
    }),

  /* ================================================================
     REORDER STOPS - Cambiar orden de los stops
     ================================================================ */
  reorderStops: adminQuery
    .input(z.object({
      routeId: z.number(),
      newOrder: z.array(z.number()), // indices en el nuevo orden
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const [routes] = await db.execute(`SELECT * FROM delivery_routes WHERE id = ${input.routeId}`);
      const route = (routes as any[])[0];
      if (!route) throw new Error("Ruta no encontrada");

      const stops = JSON.parse(route.stops);
      const reordered = input.newOrder.map(i => stops[i]);

      await db.execute(`
        UPDATE delivery_routes SET stops = '${JSON.stringify(reordered).replace(/'/g, "''")}' WHERE id = ${input.routeId}
      `);

      return { success: true };
    }),

  /* ================================================================
     MARK AS DELIVERED - Marcar entrega completada
     ================================================================ */
  markAsDelivered: adminQuery
    .input(z.object({ orderId: z.number().optional(), routeId: z.number(), stopIndex: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Actualizar orden si tiene orderId
      if (input.orderId) {
        await db.execute(`UPDATE orders SET delivery_status = 'delivered' WHERE id = ${input.orderId}`);
      }

      // Marcar en la ruta
      const [routes] = await db.execute(`SELECT * FROM delivery_routes WHERE id = ${input.routeId}`);
      const route = (routes as any[])[0];
      if (route) {
        const stops = JSON.parse(route.stops);
        if (stops[input.stopIndex]) {
          stops[input.stopIndex].delivered = true;
          await db.execute(`
            UPDATE delivery_routes SET stops = '${JSON.stringify(stops).replace(/'/g, "''")}' WHERE id = ${input.routeId}
          `);
        }
      }

      return { success: true };
    }),

  /* ================================================================
     UPDATE STOP NOTES - Editar notas de un stop
     ================================================================ */
  updateStopNotes: adminQuery
    .input(z.object({ routeId: z.number(), stopIndex: z.number(), notes: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const [routes] = await db.execute(`SELECT * FROM delivery_routes WHERE id = ${input.routeId}`);
      const route = (routes as any[])[0];
      if (!route) throw new Error("Ruta no encontrada");

      const stops = JSON.parse(route.stops);
      if (stops[input.stopIndex]) {
        stops[input.stopIndex].notes = input.notes;
        await db.execute(`
          UPDATE delivery_routes SET stops = '${JSON.stringify(stops).replace(/'/g, "''")}' WHERE id = ${input.routeId}
        `);
      }

      return { success: true };
    }),

  /* ================================================================
     GET PENDING DELIVERIES - Pedidos con envio pendiente
     ================================================================ */
  getPendingDeliveries: adminQuery
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const date = input?.date || new Date().toISOString().split('T')[0];

      const [rows] = await db.execute(`
        SELECT 
          o.id, o.shipping_address, o.preferred_time, o.shipping_type,
          o.deliveryLat, o.deliveryLng,
          u.name, u.phone
        FROM orders o
        JOIN users u ON o.userId = u.id
        WHERE o.status = 'approved'
        AND o.shipping_type IN ('express', 'free')
        AND o.delivery_status IN ('pending', 'in_route')
        AND o.shipping_address IS NOT NULL
        AND o.shipping_address != ''
        ORDER BY o.createdAt DESC
      `);

      return (rows as any[]).map(r => ({
        orderId: r.id,
        address: r.shipping_address,
        preferredTime: r.preferred_time,
        shippingType: r.shipping_type,
        lat: r.deliveryLat,
        lng: r.deliveryLng,
        userName: r.name,
        userPhone: r.phone,
      }));
    }),
});
