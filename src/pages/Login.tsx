import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/providers/trpc";
import { Lamp, Loader2 } from "lucide-react";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const { data: canReg } = trpc.auth.canRegister.useQuery();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      window.location.href = "/";
    },
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      window.location.href = "/";
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      if (!name.trim()) {
        setError("Nombre es requerido");
        return;
      }
      registerMutation.mutate({ name, email, password, phone: phone || undefined });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
              <Lamp className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">
            {mode === "login" ? "Ingresar" : "Crear cuenta"}
          </CardTitle>
          <p className="text-zinc-400 text-sm">
            {mode === "login"
              ? "Accede con tu email y contrasena"
              : "Crea la cuenta de superadmin"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <Input
                placeholder="Nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                required
              />
            )}
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              required
            />
            <Input
              placeholder="Contrasena"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
              required
              minLength={4}
            />
            {mode === "register" && (
              <Input
                placeholder="Telefono (opcional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            )}

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-5"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === "login" ? (
                "Ingresar"
              ) : (
                "Crear cuenta"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            {canReg?.canRegister && mode === "login" ? (
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className="text-sm text-yellow-500 hover:text-yellow-400"
              >
                No hay usuarios. Crear cuenta de superadmin
              </button>
            ) : mode === "register" ? (
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className="text-sm text-zinc-400 hover:text-white"
              >
                Ya tengo cuenta
              </button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
