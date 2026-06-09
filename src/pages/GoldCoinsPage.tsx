import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, History, Gift, AlertCircle, Loader2 } from "lucide-react";
import { GoldCoinsWelcomeModal } from "@/components/GoldCoinsWelcomeModal";

const GOLD_COINS_WELCOME_KEY = "gold_coins_welcome_seen_v2";

export default function GoldCoinsPage() {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  
  const { data: balance, isLoading: balanceLoading } = trpc.goldCoins.getBalance.useQuery();
  const { data: history, isLoading: historyLoading } = trpc.goldCoins.getHistory.useQuery();
  
  useEffect(() => {
    const hasSeen = localStorage.getItem(GOLD_COINS_WELCOME_KEY);
    if (!hasSeen && user) {
      setShowWelcome(true);
    }
  }, [user]);
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("es-AR");
  };
  
  if (balanceLoading || historyLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;
  }
  
  return (
    <>
      <GoldCoinsWelcomeModal open={showWelcome} onClose={() => setShowWelcome(false)} />
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Coins className="w-6 h-6 text-amber-500" />
          Mis Monedas de Oro
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-600" />
                Saldo disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-amber-600">{balance?.balance || 0} monedas</p>
              <p className="text-sm text-gray-500 mt-2">= ${balance?.balance || 0} de descuento</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                ¿Cómo funcionan?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>💰 Cada compra te da monedas = 10% del total</p>
              <p>✨ 1 moneda = $0.01 (1 centavo) de descuento</p>
              <p>⏰ Vencen a los 30 días</p>
              <p>🎯 Usalas en tu próximo pedido</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de movimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!history?.length ? (
              <p className="text-gray-500 text-center py-4">No hay movimientos aún</p>
            ) : (
              <div className="space-y-2">
                {(history as any[]).map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b py-2">
                    <div>
                      <p className="font-medium">{item.reason}</p>
                      <p className="text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                    </div>
                    <p className={`font-bold ${item.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                      {item.amount > 0 ? `+${item.amount}` : item.amount}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
