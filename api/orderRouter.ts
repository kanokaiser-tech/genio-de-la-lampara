import { z } from "zod";
import { createRouter, adminQuery, authedQuery } from "./middleware";
import {
  getOrdersByUserId,
  getOrdersByAdminId,
  getPendingOrdersByAdminId,
  createOrder,
  updateOrderStatus,
  markWebhookSent,
  getOrderWithItems,
  createOrderItems,
} from "./queries/orders";
import { getCartWithProducts, clearCart } from "./queries/cart";
import { findUserById } from "./queries/localUsers";
import { getSettings } from "./queries/settings";

export const orderRouter = createRouter({
  // Get my orders (revendedor)
  myOrders: authedQuery.query(async ({ ctx }) => {
    return getOrdersByUserId(ctx.user.id);
  }),

  // Get orders for my revendedores (admin)
  myOrdersAsAdmin: adminQuery.query(async ({ ctx }) => {
    return getOrdersByAdminId(ctx.user.id);
  }),

  // Get pending orders for my revendedores (admin)
  pendingOrders: adminQuery.query(async ({ ctx }) => {
    return getPendingOrdersByAdminId(ctx.user.id);
  }),

  // Get single order with items
  byId: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const order = await getOrderWithItems(input.id);
      if (!order) return null;
      // Check permission: revendedor can only see their own, admin can see theirs
      if (
        ctx.user.role === "revendedor" &&
        order.userId !== ctx.user.id
      ) {
        return null;
      }
      if (
        ctx.user.role === "admin" &&
        order.adminId !== ctx.user.id
      ) {
        return null;
      }
      return order;
    }),

  // Create order from cart (revendedor)
  create: authedQuery
    .input(
      z.object({
        paymentType: z.enum(["efectivo", "transferencia"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get cart items
      const cart = await getCartWithProducts(ctx.user.id);
      if (cart.length === 0) {
        throw new Error("Cart is empty");
      }

      // Get admin
      const admin = await findUserById(ctx.user.parentId ?? 0);
      if (!admin) {
        throw new Error("No admin assigned");
      }

      // Override with selected payment type
      const priceField =
        input.paymentType === "efectivo" ? "priceCash30" : "priceTransfer25";

      // Calculate total
      let totalAmount = 0;
      const orderItemsData = cart.map((item) => {
        const price = Number(item.product[priceField]);
        const subtotal = price * item.quantity;
        totalAmount += subtotal;
        return {
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          price: price.toFixed(2),
          subtotal: subtotal.toFixed(2),
        };
      });

      // Create order
      const orderId = await createOrder({
        userId: ctx.user.id,
        adminId: admin.id,
        status: "pending",
        paymentType: input.paymentType,
        notes: input.notes ?? null,
        totalAmount: totalAmount.toFixed(2),
        webhookSent: false,
      });

      // Create order items
      await createOrderItems(
        orderItemsData.map((item) => ({
          ...item,
          orderId,
        }))
      );

      // Clear cart
      await clearCart(ctx.user.id);

      // Get the order with items for the response
      const orderWithItems = await getOrderWithItems(orderId);

      return { orderId, order: orderWithItems };
    }),

  // Approve order (admin) - triggers webhook to n8n
  approve: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const order = await getOrderWithItems(input.id);
      if (!order) throw new Error("Order not found");
      if (order.adminId !== ctx.user.id) throw new Error("Not your order");

      await updateOrderStatus(input.id, "approved");

      // Send webhook to n8n if configured
      try {
        const settings = await getSettings();
        if (settings?.webhookUrl) {
          await fetch(settings.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "order.approved",
              order: {
                id: order.id,
                totalAmount: order.totalAmount,
                paymentType: order.paymentType,
                items: order.items.map((item) => ({
                  productId: item.productId,
                  productName: item.productName,
                  quantity: item.quantity,
                  price: item.price,
                })),
              },
            }),
          });
          await markWebhookSent(input.id);
        }
      } catch {
        // Webhook failure shouldn't block approval
      }

      return { success: true };
    }),

  // Reject order (admin)
  reject: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const order = await getOrderWithItems(input.id);
      if (!order) throw new Error("Order not found");
      if (order.adminId !== ctx.user.id) throw new Error("Not your order");

      await updateOrderStatus(input.id, "rejected");
      return { success: true };
    }),
});
