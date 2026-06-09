import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";

// Coordenadas del depósito
const DEPOT = { lat: -38.9516, lng: -68.0591 };

// Función de distancia
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

export const logisticsRouter = createRouter({
  geocode: adminQuery
    .input(z.object({ address: z.string() }))
    .mutation(async ({ input }) => {
      return {
        lat: DEPOT.lat + (Math.random() - 0.5) * 0.1,
        lng: DEPOT.lng + (Math.random() - 0.5) * 0.1,
        neighborhood: "Neuquén",
        confidence: "medium"
      };
    }),

  generateRoutes: adminQuery
    .input(z.object({ date: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const date = input.date || new Date().toISOString().split('T')[0];
      
      const [pending] = await db.execute(`
        SELECT 
          o.id as orderId,
          o.userId,
          o.shipping_address as address,
          o.preferred_time as preferredTime,
          o.shipping_type as shippingType,
          u.name as userName,
          u.phone as userPhone
        FROM orders o
        JOIN users u ON o.userId = u.id
        WHERE o.delivery_status = 'pending' 
        AND o.shipping_address IS NOT NULL
        AND o.shipping_address != ''
        AND o.status = 'approved'
      `);
      
      const morningStops = [];
      const afternoonStops = [];
      
      for (const order of (pending as any[])) {
        const stop = {
          orderId: order.orderId,
          userId: order.userId,
          address: order.address,
          userName: order.userName,
          userPhone: order.userPhone,
          shippingType: order.shippingType,
          lat: DEPOT.lat + (Math.random() - 0.5) * 0.05,
          lng: DEPOT.lng + (Math.random() - 0.5) * 0.05
        };
        
        if (order.preferredTime === 'morning') {
          morningStops.push(stop);
        } else {
          afternoonStops.push(stop);
        }
      }
      
      function optimizeStops(stops: any[]) {
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
      
      const optimizedMorning = optimizeStops(morningStops);
      const optimizedAfternoon = optimizeStops(afternoonStops);
      
      // Insertar usando interpolación directa (como en vendorProductRouter)
      if (optimizedMorning.length > 0) {
        const stopsJson = JSON.stringify(optimizedMorning);
        await db.execute(`
          INSERT INTO delivery_routes (routeDate, shift, stops, isActive) 
          VALUES ('${date}', 'morning', '${stopsJson.replace(/'/g, "''")}', 1)
        `);
      }
      
      if (optimizedAfternoon.length > 0) {
        const stopsJson = JSON.stringify(optimizedAfternoon);
        await db.execute(`
          INSERT INTO delivery_routes (routeDate, shift, stops, isActive) 
          VALUES ('${date}', 'afternoon', '${stopsJson.replace(/'/g, "''")}', 1)
        `);
      }
      
      return {
        success: true,
        morning: optimizedMorning.length,
        afternoon: optimizedAfternoon.length,
        total: optimizedMorning.length + optimizedAfternoon.length
      };
    }),

  getActiveRoute: adminQuery.query(async () => {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHour = now.getHours();
    const currentShift = currentHour < 14 ? 'morning' : 'afternoon';
    
    const [routes] = await db.execute(`
      SELECT * FROM delivery_routes WHERE routeDate = '${today}' AND shift = '${currentShift}' AND isActive = 1
    `);
    
    const route = (routes as any[])[0];
    if (!route) return null;
    
    return {
      id: route.id,
      shift: route.shift,
      stops: JSON.parse(route.stops),
      currentStopIndex: 0
    };
  }),

  markAsDelivered: adminQuery
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.execute(`UPDATE orders SET delivery_status = 'delivered' WHERE id = ${input.orderId}`);
      await db.execute(`UPDATE shipping_addresses SET status = 'delivered' WHERE orderId = ${input.orderId}`);
      return { success: true };
    }),

  getNextStop: adminQuery.query(async () => {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHour = now.getHours();
    const currentShift = currentHour < 14 ? 'morning' : 'afternoon';
    
    const [routes] = await db.execute(`
      SELECT * FROM delivery_routes WHERE routeDate = '${today}' AND shift = '${currentShift}' AND isActive = 1
    `);
    
    const route = (routes as any[])[0];
    if (!route) return null;
    
    const stops = JSON.parse(route.stops);
    
    for (let i = 0; i < stops.length; i++) {
      const [orders] = await db.execute(`SELECT delivery_status FROM orders WHERE id = ${stops[i].orderId}`);
      const order = (orders as any[])[0];
      if (order && order.delivery_status !== 'delivered') {
        return {
          index: i,
          ...stops[i],
          remaining: stops.length - i
        };
      }
    }
    
    return null;
  })
});
