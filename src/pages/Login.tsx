import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/providers/trpc";
import { Lamp, Loader2, ArrowLeft, MessageCircle, KeyRound, Eye, EyeOff } from "lucide-react";

type Mode = "login" | "forgot" | "reset";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Forgot/reset state
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetData, setResetData] = useState<{ code: string; phone: string; whatsappUrl: string; maskedPhone: string } | null>(null);

  const login = trpc.auth.login.useMutation({
    onSuccess: () => { window.location.href = "/"; },
    onError: (err) => setError(err.message),
  });

  const requestReset = trpc.auth.requestReset.useMutation({
    onSuccess: (data) => {
      setResetData(data);
      setShowCode(true);
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const verifyReset = trpc.auth.verifyReset.useMutation({
    onSuccess: () => {
      setMode("reset");
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setMode("login");
      setResetEmail("");
      setResetCode("");
      setNewPassword("");
      setResetData(null);
      setShowCode(false);
      setError("");
      alert("Contrasena cambiada exitosamente. Ingresa con tu nueva contrasena.");
    },
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
          <CardTitle className="text-2xl text-gray-900">
            {mode === "login" ? "Portal de Revendedores" : mode === "forgot" ? "Recuperar Contrasena" : "Nueva Contrasena"}
          </CardTitle>
          <p className="text-gray-500 text-sm">
            {mode === "login" ? "Accede con tu email y contrasena" : mode === "forgot" ? "Te enviaremos un codigo por WhatsApp" : "Crea tu nueva contrasena"}
          </p>
        </CardHeader>
        <CardContent>
          {/* ======= LOGIN ======= */}
          {mode === "login" && (
            <form onSubmit={(e) => { e.preventDefault(); setError(""); login.mutate({ email, password }); }} className="space-y-3">
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900" required />
              <Input placeholder="Contrasena" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900" required />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" size="lg" disabled={login.isPending}>
                {login.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ingresar"}
              </Button>
              <button type="button" onClick={() => { setMode("forgot"); setError(""); }} className="w-full text-center text-sm text-blue-600 hover:underline mt-2">
                Olvidaste tu contrasena?
              </button>
            </form>
          )}

          {/* ======= FORGOT ======= */}
          {mode === "forgot" && !showCode && (
            <form onSubmit={(e) => { e.preventDefault(); setError(""); requestReset.mutate({ email: resetEmail }); }} className="space-y-3">
              <Input placeholder="Email de tu cuenta" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900" required />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled={requestReset.isPending}>
                {requestReset.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><MessageCircle className="w-4 h-4 mr-2" /> Enviar codigo por WhatsApp</>}
              </Button>
              <button type="button" onClick={() => { setMode("login"); setError(""); }} className="w-full text-center text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 mt-2">
                <ArrowLeft className="w-3 h-3" /> Volver al login
              </button>
            </form>
          )}

          {/* ======= SHOW CODE ======= */}
          {mode === "forgot" && showCode && resetData && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-sm text-green-700 font-medium mb-2">Tu codigo de recuperacion:</p>
                <p className="text-3xl font-bold text-green-800 tracking-widest">{resetData.code}</p>
                <p className="text-xs text-green-600 mt-1">Valido por 10 minutos</p>
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => window.open(resetData.whatsappUrl, "_blank")}
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Enviar a WhatsApp ({resetData.maskedPhone})
              </Button>

              <p className="text-xs text-gray-500 text-center">O copia el codigo y verificalo aqui:</p>

              <form onSubmit={(e) => { e.preventDefault(); setError(""); verifyReset.mutate({ email: resetEmail, code: resetCode }); }} className="space-y-3">
                <Input placeholder="Ingresa el codigo de 6 digitos" value={resetCode} onChange={(e) => setResetCode(e.target.value)} maxLength={6} className="bg-gray-50 border-gray-300 text-gray-900 text-center tracking-widest text-lg" />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled={verifyReset.isPending}>
                  {verifyReset.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><KeyRound className="w-4 h-4 mr-2" /> Verificar codigo</>}
                </Button>
              </form>

              <button type="button" onClick={() => { setShowCode(false); setResetCode(""); setError(""); }} className="w-full text-center text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Volver
              </button>
            </div>
          )}

          {/* ======= RESET PASSWORD ======= */}
          {mode === "reset" && (
            <form onSubmit={(e) => { e.preventDefault(); setError(""); resetPassword.mutate({ email: resetEmail, code: resetCode, newPassword }); }} className="space-y-3">
              <div className="relative">
                <Input placeholder="Nueva contrasena" type={showNewPass ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-gray-50 border-gray-300 text-gray-900 pr-10" required minLength={4} />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled={resetPassword.isPending}>
                {resetPassword.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Cambiar contrasena"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
