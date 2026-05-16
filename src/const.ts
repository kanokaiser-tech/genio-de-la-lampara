export const LOGIN_PATH = "/login";

export const ROLES = {
  SUPERADMIN: "superadmin" as const,
  ADMIN: "admin" as const,
  REVENDEDOR: "revendedor" as const,
};

export function formatPrice(price: number | string): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
