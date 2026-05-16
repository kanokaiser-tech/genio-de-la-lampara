import { z } from "zod";
import { createRouter, adminQuery, superadminQuery, authedQuery } from "./middleware";
import {
  getAllUsers,
  getUsersByRole,
  getRevendedoresByAdminId,
  getAdmins,
  createUser,
  updateUser,
  deleteUser,
  findUserById,
} from "./queries/users";

export const userRouter = createRouter({
  // List all users - superadmin only
  list: superadminQuery.query(async () => {
    return getAllUsers();
  }),

  // List users by role - admin/superadmin
  byRole: adminQuery
    .input(z.object({ role: z.enum(["admin", "revendedor", "superadmin"]) }))
    .query(async ({ input }) => {
      return getUsersByRole(input.role);
    }),

  // Get revendedores assigned to current admin
  myRevendedores: adminQuery.query(async ({ ctx }) => {
    return getRevendedoresByAdminId(ctx.user.id);
  }),

  // Get all admins - for superadmin to assign revendedores
  listAdmins: superadminQuery.query(async () => {
    return getAdmins();
  }),

  // Create a new revendedor (admin creates for their team)
  createRevendedor: adminQuery
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        discountType: z.enum(["efectivo", "transferencia"]).default("efectivo"),
        unionId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createUser({
        ...input,
        role: "revendedor",
        parentId: ctx.user.id,
      });
      return { id };
    }),

  // Superadmin creates an admin
  createAdmin: superadminQuery
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        unionId: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createUser({
        ...input,
        role: "admin",
        discountType: "efectivo",
      });
      return { id };
    }),

  // Update a user
  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        discountType: z.enum(["efectivo", "transferencia"]).optional(),
        parentId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateUser(id, data);
      return { success: true };
    }),

  // Delete a user
  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteUser(input.id);
      return { success: true };
    }),

  // Get current user's admin info (for revendedores)
  myAdmin: authedQuery.query(async ({ ctx }) => {
    if (ctx.user.role !== "revendedor" || !ctx.user.parentId) {
      return null;
    }
    return findUserById(ctx.user.parentId);
  }),
});
