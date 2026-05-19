import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { createRouter, userQuery, superadminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, goldCoinTransactions } from "@db/schema";
import { sql } from "drizzle-orm";

// Valor: 1 moneda de oro = $0.01
export const GOLD_COIN_VALUE = 0.01;

// Calcular monedas ganadas por un pedido
export function calculateGoldCoins(totalAmount: number, paymentType: "efectivo" | "transferencia"): number {
  // Efectivo: 1%, Transferencia: 0.5%
  const rate = paymentType === "efectivo" ? 0.01 : 0.005;
  const pesosValue = totalAmount * rate;
  // Convertir a monedas (1 moneda = $0.01)
  return Math.round(pesosValue / GOLD_COIN_VALUE);
}

// Calcular valor en pesos de monedas
export function coinsToPesos(coins: number): number {
  return coins * GOLD_COIN_VALUE;
}

// Obtener monthKey actual (YYYY-MM)
function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const goldCoinsRouter = createRouter({
  /* ================================================================
     OBTENER SALDO ACTUAL + DIAS HASTA VENCIMIENTO
     ================================================================ */
  getBalance: userQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db.select({ goldCoins: users.goldCoins }).from(users).where(eq(users.id, ctx.user.id));

    // Calcular dias hasta fin de mes (vencimiento)
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysUntilExpiry = Math.ceil((lastDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Monedas que vencen este mes (las del mes anterior)
    const prevMonthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
    const expiringSoon = await db
      .select({ total: sql<number>`COALESCE(SUM(${goldCoinTransactions.amount}), 0)` })
      .from(goldCoinTransactions)
      .where(
        and(
          eq(goldCoinTransactions.userId, ctx.user.id),
          eq(goldCoinTransactions.type, "earned"),
          eq(goldCoinTransactions.monthKey, prevMonthKey)
        )
      );

    return {
      balance: user?.goldCoins ?? 0,
      value: coinsToPesos(user?.goldCoins ?? 0),
      daysUntilExpiry,
      expiringSoon: Number(expiringSoon[0]?.total ?? 0),
    };
  }),

  /* ================================================================
     HISTORIAL DE TRANSACCIONES
     ================================================================ */
  getHistory: userQuery.query(async ({ ctx }) => {
    const db = getDb();
    const txs = await db
      .select()
      .from(goldCoinTransactions)
      .where(eq(goldCoinTransactions.userId, ctx.user.id))
      .orderBy(desc(goldCoinTransactions.createdAt));
    return txs;
  }),

  /* ================================================================
     GANAR MONEDAS (se llama desde order.approve)
     ================================================================ */
  earn: userQuery
    .input(z.object({ orderId: z.number(), amount: z.number().int().positive(), description: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const monthKey = getCurrentMonthKey();

      // Crear transacción
      await db.insert(goldCoinTransactions).values({
        userId: ctx.user.id,
        orderId: input.orderId,
        type: "earned",
        amount: input.amount,
        description: input.description,
        monthKey,
      });

      // Sumar al saldo
      await db.execute(
        sql`UPDATE users SET goldCoins = goldCoins + ${input.amount} WHERE id = ${ctx.user.id}`
      );

      return { earned: input.amount };
    }),

  /* ================================================================
     USAR MONEDAS (se llama desde el carrito al crear pedido)
     ================================================================ */
  spend: userQuery
    .input(z.object({ orderId: z.number(), amount: z.number().int().positive(), description: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Verificar saldo
      const [user] = await db.select({ goldCoins: users.goldCoins }).from(users).where(eq(users.id, ctx.user.id));
      if (!user || user.goldCoins < input.amount) {
        throw new Error("Saldo insuficiente de monedas de oro");
      }

      const monthKey = getCurrentMonthKey();

      // Crear transacción
      await db.insert(goldCoinTransactions).values({
        userId: ctx.user.id,
        orderId: input.orderId,
        type: "spent",
        amount: -input.amount,
        description: input.description,
        monthKey,
      });

      // Restar del saldo
      await db.execute(
        sql`UPDATE users SET goldCoins = goldCoins - ${input.amount} WHERE id = ${ctx.user.id}`
      );

      return { spent: input.amount, discountPesos: coinsToPesos(input.amount) };
    }),

  /* ================================================================
     VENCER MONEDAS DEL MES PASADO (solo superadmin)
     ================================================================ */
  expireMonthly: superadminQuery
    .input(z.object({ monthKey: z.string().regex(/^\d{4}-\d{2}$/) }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Buscar usuarios que tengan monedas ganadas en ese mes
      const earnedTxs = await db
        .select({
          userId: goldCoinTransactions.userId,
          totalEarned: sql<number>`SUM(${goldCoinTransactions.amount})`,
        })
        .from(goldCoinTransactions)
        .where(
          and(
            eq(goldCoinTransactions.type, "earned"),
            eq(goldCoinTransactions.monthKey, input.monthKey)
          )
        )
        .groupBy(goldCoinTransactions.userId);

      let expiredCount = 0;

      for (const row of earnedTxs) {
        const earned = Number(row.totalEarned ?? 0);
        if (earned <= 0) continue;

        // Verificar cuántas ya se usaron/vencieron de ese mes
        const usedResult = await db
          .select({ totalUsed: sql<number>`COALESCE(SUM(ABS(${goldCoinTransactions.amount})), 0)` })
          .from(goldCoinTransactions)
          .where(
            and(
              eq(goldCoinTransactions.userId, row.userId),
              eq(goldCoinTransactions.monthKey, input.monthKey),
              sql`${goldCoinTransactions.type} IN ('spent', 'expired')`
            )
          );

        const alreadyUsed = Number((usedResult[0]?.totalUsed ?? 0));
        const available = earned - alreadyUsed;

        if (available > 0) {
          // Crear transacción de vencimiento
          await db.insert(goldCoinTransactions).values({
            userId: row.userId,
            type: "expired",
            amount: -available,
            description: `Monedas de oro vencidas del mes ${input.monthKey}`,
            monthKey: input.monthKey,
          });

          // Restar del saldo del usuario
          await db.execute(
            sql`UPDATE users SET goldCoins = GREATEST(0, goldCoins - ${available}) WHERE id = ${row.userId}`
          );

          expiredCount += available;
        }
      }

      return { expiredCount, monthKey: input.monthKey };
    }),

  /* ================================================================
     OBTENER ESTADISTICAS (superadmin)
     ================================================================ */
  stats: superadminQuery.query(async () => {
    const db = getDb();

    const monthKey = getCurrentMonthKey();

    // Total de monedas en circulación
    const balances = await db.select({ total: sql<number>`SUM(${users.goldCoins})` }).from(users);

    // Monedas ganadas este mes
    const earnedThisMonth = await db
      .select({ total: sql<number>`COALESCE(SUM(${goldCoinTransactions.amount}), 0)` })
      .from(goldCoinTransactions)
      .where(and(eq(goldCoinTransactions.type, "earned"), eq(goldCoinTransactions.monthKey, monthKey)));

    // Monedas usadas este mes
    const spentThisMonth = await db
      .select({ total: sql<number>`COALESCE(SUM(ABS(${goldCoinTransactions.amount})), 0)` })
      .from(goldCoinTransactions)
      .where(and(eq(goldCoinTransactions.type, "spent"), eq(goldCoinTransactions.monthKey, monthKey)));

    // Top usuarios con más monedas
    const topUsers = await db
      .select({ name: users.name, goldCoins: users.goldCoins })
      .from(users)
      .where(sql`${users.goldCoins} > 0`)
      .orderBy(sql`${users.goldCoins} DESC`)
      .limit(10);

    return {
      totalInCirculation: Number(balances[0]?.total ?? 0),
      earnedThisMonth: Number(earnedThisMonth[0]?.total ?? 0),
      spentThisMonth: Number(spentThisMonth[0]?.total ?? 0),
      currentMonth: monthKey,
      topUsers,
    };
  }),

  /* ================================================================
     ASIGNAR MONEDAS MANUALMENTE (superadmin)
     ================================================================ */
  adminAddCoins: superadminQuery
    .input(z.object({
      userId: z.number().int().positive(),
      amount: z.number().int().positive(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const monthKey = getCurrentMonthKey();

      // Verificar que el usuario existe
      const [targetUser] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, input.userId));
      if (!targetUser) throw new Error("Usuario no encontrado");

      // Crear transacción
      await db.insert(goldCoinTransactions).values({
        userId: input.userId,
        type: "earned",
        amount: input.amount,
        description: input.description || `Asignadas manualmente por admin`,
        monthKey,
      });

      // Sumar al saldo
      await db.execute(
        sql`UPDATE users SET goldCoins = goldCoins + ${input.amount} WHERE id = ${input.userId}`
      );

      return { success: true, assigned: input.amount, userName: targetUser.name };
    }),
});
