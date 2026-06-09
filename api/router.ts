import { authRouter } from "./auth-router";
import { userRouter } from "./userRouter";
import { productRouter } from "./productRouter";
import { orderRouter } from "./orderRouter";
import { cartRouter } from "./cartRouter";
import { settingsRouter } from "./settingsRouter";
import { tiendanubeRouter } from "./tiendanubeRouter";
import { goldCoinsRouter } from "./goldCoinsRouter";
import { vendorProductRouter } from './vendorProductRouter';
import { logisticsRouter } from "./logisticsRouter";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true })),
  auth: authRouter,
  user: userRouter,
  product: productRouter,
  order: orderRouter,
  cart: cartRouter,
  settings: settingsRouter,
  tiendanube: tiendanubeRouter,
  goldCoins: goldCoinsRouter,
  vendorProducts: vendorProductRouter,
logistics: logisticsRouter,
});

export type AppRouter = typeof appRouter;
