import { trpc } from "@/providers/trpc";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.invalidate();
      window.location.href = "/login";
    },
  });
  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);
  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: !!user,
      isLoading,
      isAdmin: user?.role === "admin",
      isRevendedor: user?.role === "revendedor",
      logout,
    }),
    [user, isLoading, logout]
  );
}
