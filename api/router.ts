import { authRouter } from "./auth-router";
import { userRouter } from "./userRouter";
import { productRouter } from "./productRouter";
import { orderRouter } from "./orderRouter";
import { cartRouter } from "./cartRouter";
import { settingsRouter } from "./settingsRouter";
import { tiendanubeRouter } from "./tiendanubeRouter";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  user: userRouter,
  product: productRouter,
  order: orderRouter,
  cart: cartRouter,
  settings: settingsRouter,
  tiendanube: tiendanubeRouter,
});

export type AppRouter = typeof appRouter;
