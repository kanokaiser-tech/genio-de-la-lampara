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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm bg-white border-gray-200 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Lamp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-gray-900">Portal de Revendedores</CardTitle>
          <p className="text-gray-500 text-sm">Accede con tu email y contrasena</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); setError(""); login.mutate({ email, password }); }} className="space-y-3">
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900" required />
            <Input placeholder="Contrasena" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900" required />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" size="lg" disabled={login.isPending}>
              {login.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
