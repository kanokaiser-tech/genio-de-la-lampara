import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/providers/trpc";
import { Lamp, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = trpc.auth.login.useMutation({
    onSuccess: () => { window.location.href = "/"; },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
              <Lamp className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Portal de Revendedores</CardTitle>
          <p className="text-zinc-400 text-sm">Accede con tu email y contrasena</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); setError(""); login.mutate({ email, password }); }} className="space-y-3">
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" required />
            <Input placeholder="Contrasena" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" required />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold" size="lg" disabled={login.isPending}>
              {login.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
