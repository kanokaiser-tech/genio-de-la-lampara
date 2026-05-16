import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import {
  hashPassword,
  comparePassword,
  signLocalToken,
} from "./localAuth";
import {
  findUserByEmail,
  createUser,
  countUsers,
} from "./queries/localUsers";

export const localAuthRouter = createRouter({
  // Login with email/password
  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const user = await findUserByEmail(input.email);
      if (!user) {
        throw new Error("Email o contraseña incorrectos");
      }

      const valid = await comparePassword(input.password, user.password);
      if (!valid) {
        throw new Error("Email o contraseña incorrectos");
      }

      const token = await signLocalToken(user.id);

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          discountType: user.discountType,
          parentId: user.parentId,
        },
      };
    }),

  // Register - only works when no users exist (first superadmin)
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(4),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if any users exist
      const userCount = await countUsers();
      if (userCount > 0) {
        throw new Error("El registro esta cerrado. Contacta al administrador.");
      }

      // Check email not taken
      const existing = await findUserByEmail(input.email);
      if (existing) {
        throw new Error("Este email ya esta registrado");
      }

      const hashed = await hashPassword(input.password);
      const id = await createUser({
        name: input.name,
        email: input.email,
        password: hashed,
        phone: input.phone ?? null,
        role: "superadmin",
        discountType: "efectivo",
        parentId: null,
      });

      const token = await signLocalToken(id!);

      return {
        token,
        user: {
          id: id,
          name: input.name,
          email: input.email,
          role: "superadmin" as const,
        },
      };
    }),

  // Get current user
  me: authedQuery.query(({ ctx }) => {
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
      phone: ctx.user.phone,
      discountType: ctx.user.discountType,
      parentId: ctx.user.parentId,
    };
  }),

  // Check if registration is open (no users yet)
  canRegister: publicQuery.query(async () => {
    const userCount = await countUsers();
    return { canRegister: userCount === 0 };
  }),
});
