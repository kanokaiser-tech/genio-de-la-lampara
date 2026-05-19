import { z } from "zod";
import { createRouter, adminQuery, superadminQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq, count } from "drizzle-orm";
import { getAllUsers, getUsersByRole, getRevendedoresByAdminId, getAdmins, createUser, updateUser, deleteUser, findUserById } from "./queries/users";
import { hashPassword } from "./localAuth";

export const userRouter = createRouter({
  list: adminQuery.query(async () => getAllUsers()),

  byRole: adminQuery
    .input(z.object({ role: z.enum(["superadmin", "admin", "revendedor"]) }))
    .query(async ({ input }) => getUsersByRole(input.role)),

  myRevendedores: adminQuery.query(async ({ ctx }) => getRevendedoresByAdminId(ctx.user.id)),

  listAdmins: adminQuery.query(async () => getAdmins()),

  // Solo superadmin puede crear admins
  createAdmin: superadminQuery
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      password: z.string().min(4),
    }))
    .mutation(async ({ input }) => {
      const { password, ...data } = input;
      const hashed = await hashPassword(password);
      const id = await createUser({ ...data, password: hashed, role: "admin", parentId: null });
      return { id };
    }),

  // Solo superadmin puede crear otro superadmin (max 2)
  createSuperadmin: superadminQuery
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      password: z.string().min(4),
    }))
    .mutation(async ({ input }) => {
      // Verificar que no haya mas de 2 superadmins
      const db = getDb();
      const [result] = await db.select({ count: count() }).from(users).where(eq(users.role, "superadmin"));
      if (result.count >= 3) {
        throw new Error("Maximo 3 superadmins permitidos");
      }
      const { password, ...data } = input;
      const hashed = await hashPassword(password);
      const id = await createUser({ ...data, password: hashed, role: "superadmin", parentId: null });
      return { id };
    }),

  createRevendedor: adminQuery
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      password: z.string().min(4),
      discountType: z.enum(["efectivo", "transferencia"]).default("efectivo"),
      parentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { password, parentId, ...data } = input;
      const hashed = await hashPassword(password);
      const assignedAdminId = parentId ?? ctx.user.id;
      const id = await createUser({ ...data, password: hashed, role: "revendedor", parentId: assignedAdminId });
      return { id };
    }),

  update: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.enum(["superadmin", "admin", "revendedor"]).optional(),
      discountType: z.enum(["efectivo", "transferencia"]).optional(),
      parentId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateUser(id, data);
      return { success: true };
    }),

  changePassword: adminQuery
    .input(z.object({ id: z.number(), newPassword: z.string().min(4) }))
    .mutation(async ({ input }) => {
      const hashed = await hashPassword(input.newPassword);
      await updateUser(input.id, { password: hashed });
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteUser(input.id);
      return { success: true };
    }),

  myAdmin: authedQuery.query(async ({ ctx }) => {
    if (ctx.user.role !== "revendedor" || !ctx.user.parentId) return null;
    return findUserById(ctx.user.parentId);
  }),
});
