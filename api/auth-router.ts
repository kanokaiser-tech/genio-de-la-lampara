import { z } from "zod";
import { eq, and, gt } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { findUserByEmail, findUserById } from "./queries/users";
import { getDb } from "./queries/connection";
import { comparePassword, signToken, hashPassword } from "./localAuth";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

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
        user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, discountType: user.discountType, parentId: user.parentId, goldCoins: user.goldCoins },
      };
    }),

  me: authedQuery.query(({ ctx }) => {
    const u = ctx.user;
    return { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, discountType: u.discountType, parentId: u.parentId, goldCoins: u.goldCoins };
  }),

  logout: authedQuery.mutation(({ ctx }) => {
    ctx.resHeaders.append("set-cookie", "auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    return { success: true };
  }),

  /* ================================================================
     RECUPERACION DE CONTRASENA POR WHATSAPP
     ================================================================ */
  requestReset: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await findUserByEmail(input.email);
      if (!user) throw new Error("Email no encontrado");
      if (!user.phone) throw new Error("Este usuario no tiene numero de telefono registrado. Contacta al administrador.");

      const db = getDb();

      // Invalidar códigos anteriores
      await db.execute(`UPDATE passwordResets SET used = TRUE WHERE userId = ${user.id}` as any);

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

      await db.execute(
        `INSERT INTO passwordResets (userId, code, expiresAt, used) VALUES (${user.id}, '${code}', '${expiresAt.toISOString().slice(0,19).replace('T',' ')}', FALSE)` as any
      );

      // Construir URL de WhatsApp
      const cleanPhone = user.phone.replace(/\D/g, "");
      const message = `Hola! Tu codigo de recuperacion de contrasena para Genio de la Lampara es: *${code}*. Valido por 10 minutos.`;
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

      return {
        code, // lo devolvemos para mostrarlo en pantalla también
        phone: user.phone,
        whatsappUrl,
        maskedPhone: user.phone.slice(0, -4) + "****",
      };
    }),

  verifyReset: publicQuery
    .input(z.object({ email: z.string().email(), code: z.string().length(6) }))
    .mutation(async ({ input }) => {
      const user = await findUserByEmail(input.email);
      if (!user) throw new Error("Email no encontrado");

      const db = getDb();
      const result = await db.execute(
        `SELECT * FROM passwordResets WHERE userId = ${user.id} AND code = '${input.code}' AND used = FALSE AND expiresAt > NOW() ORDER BY createdAt DESC LIMIT 1` as any
      );
      const rows = (result as any)[0] as any[];
      if (!rows || rows.length === 0) throw new Error("Codigo invalido o expirado");

      return { valid: true, email: input.email, code: input.code };
    }),

  resetPassword: publicQuery
    .input(z.object({ email: z.string().email(), code: z.string().length(6), newPassword: z.string().min(4) }))
    .mutation(async ({ input }) => {
      const user = await findUserByEmail(input.email);
      if (!user) throw new Error("Email no encontrado");

      const db = getDb();
      const result = await db.execute(
        `SELECT * FROM passwordResets WHERE userId = ${user.id} AND code = '${input.code}' AND used = FALSE AND expiresAt > NOW() ORDER BY createdAt DESC LIMIT 1` as any
      );
      const rows = (result as any)[0] as any[];
      if (!rows || rows.length === 0) throw new Error("Codigo invalido o expirado");

      // Marcar código como usado
      await db.execute(`UPDATE passwordResets SET used = TRUE WHERE id = ${rows[0].id}` as any);

      // Cambiar contraseña
      const hashed = await hashPassword(input.newPassword);
      await db.execute(`UPDATE users SET password = '${hashed}' WHERE id = ${user.id}` as any);

      return { success: true };
    }),

  /* ================================================================
     CAMBIAR CONTRASENA PROPIA (cualquier usuario autenticado)
     ================================================================ */
  changeMyPassword: authedQuery
    .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(4) }))
    .mutation(async ({ ctx, input }) => {
      const user = await findUserById(ctx.user.id);
      if (!user) throw new Error("Usuario no encontrado");

      const valid = await comparePassword(input.currentPassword, user.password);
      if (!valid) throw new Error("Contrasena actual incorrecta");

      const hashed = await hashPassword(input.newPassword);
      await getDb().execute(`UPDATE users SET password = '${hashed}' WHERE id = ${user.id}` as any);

      return { success: true };
    }),
});
