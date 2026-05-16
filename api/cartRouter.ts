import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  getCartWithProducts,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
} from "./queries/cart";

export const cartRouter = createRouter({
  // Get cart with product details
  get: authedQuery.query(async ({ ctx }) => {
    return getCartWithProducts(ctx.user.id);
  }),

  // Add item to cart
  add: authedQuery
    .input(
      z.object({
        productId: z.number(),
        quantity: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await addToCart({
        userId: ctx.user.id,
        productId: input.productId,
        quantity: input.quantity,
      });
      return { success: true };
    }),

  // Update quantity
  updateQuantity: authedQuery
    .input(
      z.object({
        productId: z.number(),
        quantity: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateCartItemQuantity(ctx.user.id, input.productId, input.quantity);
      return { success: true };
    }),

  // Remove item
  remove: authedQuery
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await removeFromCart(ctx.user.id, input.productId);
      return { success: true };
    }),

  // Clear cart
  clear: authedQuery.mutation(async ({ ctx }) => {
    await clearCart(ctx.user.id);
    return { success: true };
  }),
});
