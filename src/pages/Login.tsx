import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lamp } from "lucide-react";

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
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
          <p className="text-zinc-400 text-sm">
            Accede a tus precios especiales con descuentos exclusivos
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-5"
            size="lg"
            onClick={() => {
              window.location.href = getOAuthUrl();
            }}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            Ingresar con Kimi
          </Button>
          <p className="text-zinc-500 text-xs text-center">
            Si no tenes cuenta, contacta a tu administrador
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
