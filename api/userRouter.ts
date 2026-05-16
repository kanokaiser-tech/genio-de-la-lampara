import { z } from "zod";
import { createRouter, adminQuery, authedQuery } from "./middleware";
import { getAllUsers, getUsersByRole, getRevendedoresByAdminId, getAdmins, createUser, updateUser, deleteUser, findUserById } from "./queries/users";
import { hashPassword } from "./localAuth";

export const userRouter = createRouter({
  list: adminQuery.query(async () => getAllUsers()),

  byRole: adminQuery
    .input(z.object({ role: z.enum(["admin", "revendedor"]) }))
    .query(async ({ input }) => getUsersByRole(input.role)),

  myRevendedores: adminQuery.query(async ({ ctx }) => getRevendedoresByAdminId(ctx.user.id)),

  listAdmins: adminQuery.query(async () => getAdmins()),

  createRevendedor: adminQuery
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      password: z.string().min(4),
      discountType: z.enum(["efectivo", "transferencia"]).default("efectivo"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { password, ...data } = input;
      const hashed = await hashPassword(password);
      const id = await createUser({ ...data, password: hashed, role: "revendedor", parentId: ctx.user.id });
      return { id };
    }),

  createAdmin: adminQuery
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

  update: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.enum(["admin", "revendedor"]).optional(),
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
