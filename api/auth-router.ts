import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { findUserByEmail } from "./queries/users";
import { comparePassword, signToken } from "./localAuth";

export const authRouter = createRouter({
  login: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const user = await findUserByEmail(input.email);
      if (!user) throw new Error("Email o contrasena incorrectos");

      const valid = await comparePassword(input.password, user.password);
      if (!valid) throw new Error("Email o contrasena incorrectos");

      const token = await signToken(user.id);

      // Set httpOnly cookie
      ctx.resHeaders.append(
        "set-cookie",
        `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
      );

      return {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, discountType: user.discountType, parentId: user.parentId },
      };
    }),

  me: authedQuery.query(({ ctx }) => {
    const u = ctx.user;
    return { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, discountType: u.discountType, parentId: u.parentId };
  }),

  logout: authedQuery.mutation(({ ctx }) => {
    ctx.resHeaders.append("set-cookie", "auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    return { success: true };
  }),
});
